export type Id<T extends string> = string & { __brand: T };
