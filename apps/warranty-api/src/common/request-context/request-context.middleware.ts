import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  DEFAULT_VERSION,
  newId,
  runWithContext,
  type RequestContext,
} from './request-context';

const logger = new Logger('HTTP');
const SAFE_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Runs first on every request (registered with app.use, so unmatched routes get it too):
 * opens the request context, sets x-request-id, and writes one access-log line on finish.
 */
export function requestContextMiddleware(trustInboundId: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const inbound = req.header('x-request-id');
    const ctx: RequestContext = {
      requestId:
        trustInboundId && inbound && SAFE_ID.test(inbound)
          ? inbound
          : newId('req'),
      version: /^\/api\/(v\d+)\//.exec(req.originalUrl)?.[1] ?? DEFAULT_VERSION,
    };
    const start = process.hrtime.bigint();
    res.setHeader('x-request-id', ctx.requestId);

    res.on('finish', () => {
      // Matched route pattern keeps ids out of logs; fall back to the path without query string.
      const route =
        (req.route as { path?: string } | undefined)?.path ??
        req.originalUrl.split('?')[0];
      logger.log({
        requestId: ctx.requestId,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Number((process.hrtime.bigint() - start) / 1_000_000n),
        userId: ctx.userId,
      });
    });

    runWithContext(ctx, next);
  };
}
