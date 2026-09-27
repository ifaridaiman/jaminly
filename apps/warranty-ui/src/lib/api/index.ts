import { httpAuthApi } from './http';
import { mockApi } from './mock';
import type { ApiClient } from './types';

export { ApiError, errorMessage } from './errors';
export { onSessionEnded } from './http';

// Auth + account: real API. Warranties: mock until the API's warranty endpoints exist (M2).
export const api: ApiClient = { ...mockApi, ...httpAuthApi };
export type * from './types';
