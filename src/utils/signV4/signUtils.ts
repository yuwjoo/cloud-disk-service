import _toString from 'lodash/toString';
import qs from 'qs';
import is from 'is-type-of';
import crypto from 'crypto';

/**
 * @param {string[]} [additionalHeaders]
 * @returns {string[]}
 */
export function fixAdditionalHeaders(additionalHeaders: string[]): string[] {
  if (!additionalHeaders) {
    return [];
  }

  const OSS_PREFIX = 'x-oss-';

  return [...new Set(additionalHeaders.map((v) => v.toLowerCase()))]
    .filter((v) => {
      return v !== 'content-type' && v !== 'content-md5' && !v.startsWith(OSS_PREFIX);
    })
    .sort();
}

export function getStandardRegion(str: string) {
  return str.replace(/^oss-/g, '');
}

/**
 * @param {string} method
 * @param {Object} request
 * @param {Object} request.headers
 * @param {Object} [request.queries]
 * @param {string} [bucketName]
 * @param {string} [objectName]
 * @param {string[]} [additionalHeaders] additional headers after deduplication, lowercase and sorting
 * @returns {string}
 */
export function getCanonicalRequest(
  method: string,
  request: { headers: Record<string, any>; queries: Record<string, any> },
  bucketName: string,
  objectName: string,
  additionalHeaders: string[]
): string {
  const headers = lowercaseKeyHeader(request.headers);
  const queries = request.queries || {};
  const OSS_PREFIX = 'x-oss-';

  if (objectName && !bucketName) {
    throw Error('Please ensure that bucketName is passed into getCanonicalRequest.');
  }

  const signContent = [
    method.toUpperCase(), // HTTP Verb
    encodeString(`/${bucketName ? `${bucketName}/` : ''}${objectName || ''}`).replace(/%2F/g, '/') // Canonical URI
  ];

  // Canonical Query String
  signContent.push(
    qs.stringify(queries, {
      encoder: encodeString,
      sort: (a, b) => a.localeCompare(b),
      strictNullHandling: true
    })
  );

  // Canonical Headers
  if (additionalHeaders) {
    additionalHeaders.forEach((v) => {
      if (!Object.prototype.hasOwnProperty.call(headers, v)) {
        throw Error(`Can't find additional header ${v} in request headers.`);
      }
    });
  }

  const tempHeaders = new Set(additionalHeaders);

  Object.keys(headers).forEach((v) => {
    if (v === 'content-type' || v === 'content-md5' || v.startsWith(OSS_PREFIX)) {
      tempHeaders.add(v);
    }
  });

  const canonicalHeaders = `${[...tempHeaders]
    .sort()
    .map((v) => `${v}:${is.string(headers[v]) ? headers[v].trim() : headers[v]}\n`)
    .join('')}`;

  signContent.push(canonicalHeaders);

  // Additional Headers
  if (additionalHeaders.length > 0) {
    signContent.push(additionalHeaders.join(';'));
  } else {
    signContent.push('');
  }

  // Hashed Payload
  signContent.push(headers['x-oss-content-sha256'] || 'UNSIGNED-PAYLOAD');

  return signContent.join('\n');
}

/**
 * @param {string} region Standard region, e.g. cn-hangzhou
 * @param {string} date ISO8601 UTC:yyyymmdd'T'HHMMss'Z'
 * @param {string} canonicalRequest
 * @returns {string}
 */
export function getStringToSign(region: string, date: string, canonicalRequest: string): string {
  const stringToSign = [
    'OSS4-HMAC-SHA256',
    date, // TimeStamp
    `${date.split('T')[0]}/${region}/oss/aliyun_v4_request`, // Scope
    crypto.createHash('sha256').update(canonicalRequest).digest('hex') // Hashed Canonical Request
  ];

  return stringToSign.join('\n');
}

/**
 * @param {String} accessKeySecret
 * @param {string} date yyyymmdd
 * @param {string} region Standard region, e.g. cn-hangzhou
 * @param {string} stringToSign
 * @returns {string}
 */
export function getSignatureV4(
  accessKeySecret: string,
  date: string,
  region: string,
  stringToSign: string
): string {
  const signingDate = crypto
    .createHmac('sha256', `aliyun_v4${accessKeySecret}`)
    .update(date)
    .digest();
  const signingRegion = crypto.createHmac('sha256', signingDate).update(region).digest();
  const signingOss = crypto.createHmac('sha256', signingRegion).update('oss').digest();
  const signingKey = crypto.createHmac('sha256', signingOss).update('aliyun_v4_request').digest();
  const signatureValue = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return signatureValue;
}

function lowercaseKeyHeader(headers: any): Record<string, any> {
  const isObject = (obj: any) => {
    return Object.prototype.toString.call(obj) === '[object Object]';
  };

  const lowercaseHeader = {};
  if (isObject(headers)) {
    Object.keys(headers).forEach((key) => {
      (lowercaseHeader as Record<string, any>)[key.toLowerCase()] = headers[key];
    });
  }
  return lowercaseHeader;
}

function encodeString(str: unknown) {
  const tempStr = _toString(str);

  return encodeURIComponent(tempStr).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
