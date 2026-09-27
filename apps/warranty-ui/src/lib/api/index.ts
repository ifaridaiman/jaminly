import { httpAuthApi, httpWarrantyApi } from './http';
import type { ApiClient } from './types';

export { ApiError, errorMessage } from './errors';
export { onSessionEnded } from './http';

export const api: ApiClient = { ...httpAuthApi, ...httpWarrantyApi };
export type * from './types';
