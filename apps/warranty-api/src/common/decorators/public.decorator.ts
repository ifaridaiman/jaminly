import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'is-public';

/** Opts a route (or controller) out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
