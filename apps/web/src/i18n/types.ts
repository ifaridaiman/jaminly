import type en from './en';

type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };

/** Shape of every language's dictionary, derived from English. */
export type Dictionary = Strings<typeof en>;
