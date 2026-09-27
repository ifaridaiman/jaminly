import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export type RequestContext = {
  requestId: string;
  version: string; // "v1"
  userId?: string; // set by the auth guard once the token is verified
};

const storage = new AsyncLocalStorage<RequestContext>();

export const DEFAULT_VERSION = 'v1';

/** Current request's context. Outside a request (e.g. module init) returns a throwaway one. */
export function getRequestContext(): RequestContext {
  return (
    storage.getStore() ?? { requestId: newId('req'), version: DEFAULT_VERSION }
  );
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export const newId = (prefix: 'req' | 'job') => `${prefix}_${randomUUID()}`;
