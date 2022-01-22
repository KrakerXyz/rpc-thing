
export type Service<T> = { [K in keyof T]: T[K] extends symbol ? never :  ((...args: any[]) => any) | Service<T[K]> }; 

export type PromisfiedService<T extends Service<T>> = ExpandDeep<{
   [K in keyof T]: T[K] extends StaticValue ? () => PromiseWrap<T[K]> : T[K] extends symbol ? never : T[K] extends (...args: infer TArgs) => infer TReturn ? (...args: TArgs) => PromiseWrap<MapValue<TReturn>> : () => Promise<MapValue<T[K]>>
}>;

type ExpandDeep<T> =
   T extends (...args: any[]) => any
      ? T //Return functions as-is
      : T extends Promise<any> 
         ? T
         : T extends object
            ? T extends infer O
               ? { [K in keyof O]: ExpandDeep<O[K]> }
               : never
            : T;

type PromiseWrap<T> = T extends Promise<infer PT> ? Promise<PT> : Promise<T>;

type StaticValue = string | number | boolean | null | undefined | Promise<StaticValue>;

type MapValue<T> = T extends StaticValue ? PromiseWrap<T>: T extends AsyncGenerator ? T : T extends Promise<infer PT> ? MapValue<PT> : T extends void ? void : T extends (...args: infer TArgs) => infer TReturn ? (...args: TArgs) => Promise<MapValue<TReturn>> : T extends Record<string, any> ? MapObject<T> : T extends (infer U)[] ? MapValue<U>[] : never;

type MapObject<T> = ExpandDeep<{
   [K in keyof T]: T[K] extends StaticValue ? T[K] : T[K] extends symbol ? never : MapValue<T[K]>
}>

// export type Test = {
//    f: () => void;
//    s: symbol;
//    a: string;
//    b: number;
//    c: {
//       s1: symbol,
//       a1: boolean;
//       b1: () => void;
//    };
//    d: () => {
//       a2: boolean;
//       b2: () => {
//          a3: 'test',
//          b3: () => Promise<void>;
//       }
//    };
//    arr: [number, { a: string, b: () => number }, () => void];
// }
// export type Root = PromisfiedService<Test>;