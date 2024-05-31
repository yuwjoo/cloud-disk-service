import type { RouteRequest, RouteResponse } from 'types/src/utils/router';
import type { StsRequestQuery, StsResponseData } from 'types/src/routers/oss/sts';
import { useConfig } from '@/utils/config';
import { useSTS } from '@/utils/oss';
import { defineResponseBody, defineRoute } from '@/utils/router';

export default defineRoute({
  method: 'get',
  handler: sts
});

/**
 * @description: sts临时访问凭证接口
 * @param {Request} _req 请求
 * @param {Response} res 响应
 */
async function sts(_req: RouteRequest<any, StsRequestQuery>, res: RouteResponse<StsResponseData>) {
  const now = new Date();
  const account = res.locals.user.account;
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const context = `${account}/${year}/${month}/${date}`;

  let policy;

  if (res.locals.user.role_code !== '001') {
    policy = {
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['oss:PutObject', 'oss:PutObjectTagging'],
          Resource: [`acs:oss:*:*:${useConfig().oss.bucketName}/storage/${context}/*`]
        }
      ]
    };
  }

  const stsData = await useSTS().assumeRole(
    useConfig().oss.stsRAMRole,
    JSON.stringify(policy),
    useConfig().ossStsExpirationTime,
    res.locals.user.account
  );

  const responseData = {
    AccessKeyId: stsData.credentials.AccessKeyId,
    AccessKeySecret: stsData.credentials.AccessKeySecret,
    SecurityToken: stsData.credentials.SecurityToken,
    Expiration: stsData.credentials.Expiration,
    context
  };

  res.json(defineResponseBody({ data: responseData }));
}
