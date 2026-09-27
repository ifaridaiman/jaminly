import { getRequestContext } from '../request-context/request-context';
import type { ApiError, ApiMeta, ApiResponse } from './api-response.types';

function meta(): ApiMeta {
  const { requestId, version } = getRequestContext();
  return { requestId, timestamp: new Date().toISOString(), version };
}

/** Only the response interceptor and the exception filter call these. Controllers return plain data. */
export const ApiResponseBuilder = {
  success<T>(code: string, message: string, data: T): ApiResponse<T> {
    return { success: true, code, message, data, errors: [], meta: meta() };
  },
  failure(
    code: string,
    message: string,
    errors: ApiError[] = [],
  ): ApiResponse<null> {
    return { success: false, code, message, data: null, errors, meta: meta() };
  },
};
