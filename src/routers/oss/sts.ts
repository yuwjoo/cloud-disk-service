import type { STSRecordsTable } from 'types/src/utils/database';
import type { STSRequestBody, STSRequestQuery, STSResponseBody } from 'types/src/routers/oss/sts';
import { useConfig } from '@/utils/config';
import { useSTS } from '@/utils/oss';
import { defineResponseBody, defineRoute } from '@/utils/router';
import { useDatabase } from '@/utils/database';

export default defineRoute({
  method: 'get',
  handler: sts
});

/**
 * @description: sts临时访问凭证接口
 * @param {RouteRequest} _req 请求
 * @param {RouteResponse} res 响应
 */
async function sts(
  _req: RouteRequest<STSRequestBody, STSRequestQuery>,
  res: RouteResponse<STSResponseBody>
) {
  const historySTS = useDatabase()
    .prepare<STSRecordsTable['account'], STSRecordsTable>(
      `SELECT * FROM sts_records WHERE account = ?`
    )
    .get(res.locals.user.account);

  // 存在历史sts并且未过期
  if (historySTS && new Date(historySTS.expiration) > new Date()) {
    res.json(
      defineResponseBody({
        data: {
          AccessKeyId: historySTS.access_key_id,
          AccessKeySecret: historySTS.access_key_secret,
          SecurityToken: historySTS.security_token,
          Expiration: historySTS.expiration,
          uploadPath: historySTS.upload_path
        }
      })
    );
    return;
  }

  const now = new Date();
  const account = res.locals.user.account;
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const uploadPath = `storage/${account}/${year}-${month}-${date}/${now.getHours()}H${now.getMinutes()}M${now.getSeconds()}S`;
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
    res.locals.user.account
  );
  const saveSTSSQL = historySTS
    ? `UPDATE sts_records SET access_key_id = $access_key_id, access_key_secret = $access_key_secret, security_token = $security_token, expiration = $expiration, upload_path = $upload_path WHERE account = $account;`
    : `INSERT INTO sts_records (access_key_id, access_key_secret, security_token, expiration, upload_path, account) VALUES ( $access_key_id, $access_key_secret, $security_token, $expiration, $upload_path, $account );`;

  useDatabase().prepare<STSRecordsTable>(saveSTSSQL).run({
    account: res.locals.user.account,
    access_key_id: credentials.AccessKeyId,
    access_key_secret: credentials.AccessKeySecret,
    security_token: credentials.SecurityToken,
    expiration: credentials.Expiration,
    upload_path: uploadPath
  }); // 保存sts记录

  res.json(defineResponseBody({ data: { ...credentials, uploadPath } }));
}
