import type OSS from 'ali-oss';

export interface OSSIns extends OSS {
  signatureUrlV4: (
    method: string,
    expires: number,
    request?: {
      headers?: Record<string, any>;
      queries?: Record<string, any>;
    },
    objectName?: string,
    additionalHeaders?: string[]
  ) => Promise<string>;
}
