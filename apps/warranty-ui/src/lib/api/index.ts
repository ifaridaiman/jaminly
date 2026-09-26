import { mockApi } from './mock';

export { MOCK_DELETION_CODE } from './mock';

// ponytail: mock only. Add http.ts and switch on env.useMockApi at M2.
export const api = mockApi;
export type * from './types';
