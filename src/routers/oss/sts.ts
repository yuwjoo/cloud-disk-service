import type { STSRecordsTable } from 'types/src/utils/database';
import type { STSRequestBody, STSRequestQuery, STSResponseBody } from 'types/src/routers/oss/sts';
import { useConfig } from '@/utils/config';
import { useSTS } from '@/utils/oss';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';
import tinytime from 'tinytime';

const timeTemplate = tinytime('{YYYY}-{Mo}-{DD}/{H}H{mm}M{ss}S', { padMonth: true }); // 时间格式化模板

/**
 * @description: sts临时访问凭证接口
 */
export default defineRoute({
  method: 'get',
  handler: async (
    req: RouteRequest<STSRequestBody, STSRequestQuery>,
    res: RouteResponse<STSResponseBody>
  ) => {
    const { user } = req.locals;

    const cacheSTS = selectCacheSTS(user.account);
    if (cacheSTS && new Date(cacheSTS.expiration) > new Date()) {
      // 存在缓存sts并且未过期
      res.json(
        defineResponseBody({
          data: {
            AccessKeyId: cacheSTS.access_key_id,
            AccessKeySecret: cacheSTS.access_key_secret,
            SecurityToken: cacheSTS.security_token,
            Expiration: cacheSTS.expiration,
            uploadPath: cacheSTS.upload_path
          }
        })
      );
      return;
    }

    const uploadPath = `storage/${user.account}/${timeTemplate.render(new Date())}`;
    const policy = {
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['oss:PutObject', 'oss:PutObjectTagging'],
          Resource: [`acs:oss:*:*:${useConfig().oss.bucketName}/${uploadPath}/*`]
        }
      ]
    };
    const { credentials } = await useSTS().assumeRole(
      useConfig().oss.stsRAMRole,
      JSON.stringify(policy),
      useConfig().ossStsExpirationTime,
      user.account
    );

    const saveSTS = cacheSTS ? updateCacheSTS : insertCacheSTS;

    saveSTS({
      account: user.account,
      access_key_id: credentials.AccessKeyId,
      access_key_secret: credentials.AccessKeySecret,
      security_token: credentials.SecurityToken,
      expiration: credentials.Expiration,
      upload_path: uploadPath
    }); // 保存sts记录

    res.json(defineResponseBody({ data: { ...credentials, uploadPath } }));
  }
});

/**
 * @description: 查询缓存sts记录
 */
function selectCacheSTS(params: STSRecordsTable['account']): STSRecordsTable | undefined {
  const sql = `SELECT * FROM sts_records WHERE account = ?`;
  return useDatabase().prepare<typeof params, ReturnType<typeof selectCacheSTS>>(sql).get(params);
}

/**
 * @description: 更新sts缓存
 */
function updateCacheSTS(params: STSRecordsTable) {
  const sql = `UPDATE sts_records SET access_key_id = $access_key_id, access_key_secret = $access_key_secret, security_token = $security_token, expiration = $expiration, upload_path = $upload_path WHERE account = $account;`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}

/**
 * @description: 插入sts缓存
 */
function insertCacheSTS(params: STSRecordsTable) {
  const sql = `INSERT INTO sts_records (access_key_id, access_key_secret, security_token, expiration, upload_path, account) VALUES ( $access_key_id, $access_key_secret, $security_token, $expiration, $upload_path, $account );`;
  return useDatabase().prepare<typeof params>(sql).run(params);
}
