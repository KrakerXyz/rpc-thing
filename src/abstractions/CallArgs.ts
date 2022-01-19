
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
   /** The value */
   v: any;
}

export interface ArrayArg {
   t: ArgType.Array
   /** A Arg for each element of the array */
   e: Arg[];
}

export interface ObjectArg {
   t: ArgType.Object
   /** Property name/Arg map */
   p: Record<string, Arg>;
}

export interface FunctionArg {
   t: ArgType.Function;
   /** Id for linking function between client and remote */
   id: string;
}