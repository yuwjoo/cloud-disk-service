import urlUtil from 'url';

import {
  fixAdditionalHeaders,
  getStandardRegion,
  getCanonicalRequest,
  getStringToSign,
  getSignatureV4
} from './signUtils';
import { useConfig } from '../config';
// import { setSTSToken } from '../utils/setSTSToken';
// import { isFunction } from '../utils/isFunction';
// import { getStandardRegion } from '../utils/getStandardRegion';

/**
 * signatureUrlV4
 *
 * @param {string} method
 * @param {number} expires
 * @param {Object} [request]
 * @param {Object} [request.headers]
 * @param {Object} [request.queries]
 * @param {string} [objectName]
 * @param {string[]} [additionalHeaders]
 */
export default function signatureUrlV4(
  method: string,
  expires: number,
  request: { headers: Record<string, any>; queries: Record<string, any> },
  objectName: string,
  additionalHeaders: string[]
): string {
  const headers = (request && request.headers) || {};
  const queries = { ...((request && request.queries) || {}) };
  const formattedDate = new Date()
    .toISOString()
    .replace('t', 'T')
    .replace(/\-|\:/g, '')
    .replace(/\..+Z$/, 'Z');
  const onlyDate = formattedDate.split('T')[0];
  const fixedAdditionalHeaders = fixAdditionalHeaders(additionalHeaders);
  const region = getStandardRegion('oss-cn-shenzhen');

  if (fixedAdditionalHeaders.length > 0) {
    queries['x-oss-additional-headers'] = fixedAdditionalHeaders.join(';');
  }
  queries['x-oss-credential'] = `${
    useConfig().oss.adminAccessKeyID
  }/${onlyDate}/${region}/oss/aliyun_v4_request`;
  queries['x-oss-date'] = formattedDate;
  queries['x-oss-expires'] = expires;
  queries['x-oss-signature-version'] = 'OSS4-HMAC-SHA256';

  //   和STS相关的操作
  //   if (this.options.stsToken && isFunction(this.options.refreshSTSToken)) {
  //     await setSTSToken.call(this);
  //   }

  //   if (this.options.stsToken) {
  //     queries['x-oss-security-token'] = this.options.stsToken;
  //   }

  const canonicalRequest = getCanonicalRequest(
    method,
    {
      headers,
      queries
    },
    useConfig().oss.bucketName,
    objectName,
    fixedAdditionalHeaders
  );
  const stringToSign = getStringToSign(region, formattedDate, canonicalRequest);

  queries['x-oss-signature'] = getSignatureV4(
    useConfig().oss.adminAccessKeySecret,
    onlyDate,
    region,
    stringToSign
  );

  const searchParams = new urlUtil.URLSearchParams(Object.entries(queries));
  return searchParams.toString();

  //   const signedUrl = urlUtil.parse("wefwef");
  //   signedUrl.query = { ...queries };

  //   return signedUrl.format();
}
