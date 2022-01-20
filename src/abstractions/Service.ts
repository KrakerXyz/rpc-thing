
export type Service<T> = { [K in keyof T]:  ((...args: any[]) => any) | Service<T[K]> }; 

export type PromiseWrap<T> = T extends Promise<infer TInner>
   ? PromisfiedService<TInner>
   : T extends (...args: infer TArgs) => infer TReturn
      ? (...args: TArgs) => Promise<TReturn>
      : Promise<T>;

export type ExpandDeep<T> =
   T extends (...args: any[]) => any
      ? T //Return functions as-is
      : T extends Promise<any> 
         ? T
         : T extends object
            ? T extends infer O
               ? { [K in keyof O]: ExpandDeep<O[K]> }
               : never
            : T;

/** Recursively wraps each method's return type with a Promise */
export type PromisfiedService<T extends Service<T>> = ExpandDeep<{
   [K in keyof T]:
   T[K] extends (...args: infer TArgs) => infer TReturn
      ? (...args: TArgs) => PromiseWrap<TReturn>
      : T[K] extends (string | number | boolean) ? () => Promise<T[K]>
         : T[K] extends AsyncGenerator<any> ? () => Promise<T[K]>
            : T[K] extends Record<string, any>
               ? () => Promise<PromisfiedService<T[K]>>
               : PromisfiedService<T[K]>
}>;