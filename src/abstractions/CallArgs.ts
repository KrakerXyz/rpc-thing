
export interface CallArgs {
   path: string[];
   args: Arg[];
}

export enum ArgType {
   Value,
   Object,
   Array,
   Function
}

export type Arg = ValueArg | ObjectArg | ArrayArg | FunctionArg

export interface ValueArg {
   t: ArgType.Value;
   v: any;
}

export interface ArrayArg {
   t: ArgType.Array
}

export interface ObjectArg {
   t: ArgType.Object
}

export interface FunctionArg {
   t: ArgType.Function
}