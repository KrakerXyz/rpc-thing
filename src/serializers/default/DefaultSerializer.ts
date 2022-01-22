import { v4 } from 'uuid';
import { CallArgs, Transport, Serializer, Service, Arg, ArgType } from '../../abstractions/index.js';
import { RpcThing } from '../../RpcThing.js';

export class DefaultSerializer<TService extends Service<TService>> implements Serializer {
   public constructor(private readonly _transport: Transport, private readonly service: TService) {
      if (_transport.setPushHandler) {
         _transport.setPushHandler(data => {
            const result = this.invoke(data as RemoteInvoke);
            return {
               handled: true,
               result
            };
         });
      }
   }

   public verboseLogging: boolean = false;

   public remoteInvoke(path: string[], args: unknown[]): Promise<unknown> {
      const result = this.internalRemoteInvoke(path, args, undefined) as any;
      return result;
   }

   private createArgs(args: readonly unknown[], functionMap: Record<string, (...args: any[]) => void>): Arg[] {
      const outArgs: Arg[] = [];
      for (const a of args) {

         if (a === null) {
            outArgs.push({ t: ArgType.Value, v: null });
            continue;
         }

         const type = typeof a;
         if (type === 'symbol') {
            throw new Error('Using a symbol as a argument is not supported');
         }

         if (type === 'object') {
         
            if (Array.isArray(a)) {
               outArgs.push({ t: ArgType.Array, e: this.createArgs(a, functionMap) });
               continue;
            }

            const entries = Object.keys(a as any).map(k => [k, this.createArgs([(a as any)[k]], functionMap)[0]]);
            const p = Object.fromEntries(entries);
            outArgs.push({ t: ArgType.Object, p });

            continue;
         }

         if (type === 'function') {
            const id = v4();
            functionMap[id] = a as (...args: any[]) => void;
            outArgs.push({ t: ArgType.Function, id });
            continue;
         }

         outArgs.push({ t: ArgType.Value, v: a });
      }

      return outArgs;
   }

   /** Hold a list of functions based on function id per call id */
   private readonly _functionMapByCallId: Map<string, Record<string, (...args: any[]) => any>> = new Map();

   private async internalRemoteInvoke(path: string[], args: unknown[], parentCallId: string | undefined): Promise<unknown> {

      const functionMap: Record<string, (...args: any[]) => any> = {};
      const callArgs: CallArgs = {
         path,
         args: this.createArgs(args, functionMap)
      };

      const call: Call = {
         t: InvokeType.Call,
         parentCallId,
         callId: v4(),
         callArgs
      };

      this._functionMapByCallId.set(call.callId, functionMap);

      this.log(`Remoting call for ${call.callArgs.path} as callId ${call.callId}`);
      const remoteResponse = await this._transport.invoke(call) as SerializedResult;

      const result = this.deserializeRemoteResponse(remoteResponse);

      return result;
 
   }

   private readonly _finalizerRegistry = new FinalizationRegistry(async callId => {
      this.log(`FinalizationRegistry triggered for callId ${callId}`);
      const finalize: Finalize = {
         t: InvokeType.Finalize,
         callId: callId as string
      };
      await this._transport.invoke(finalize);
      this._functionMapByCallId.delete(finalize.callId);
   });

   private deserializeRemoteResponse(remoteResponse: SerializedResult): any {

      const callId = remoteResponse.callId;
      const resultType = remoteResponse.t;

      if (resultType === ResultType.Object || resultType === ResultType.Function) {

         const obj: any = {};
         if (resultType === ResultType.Object) {
            for (const v of (remoteResponse.vs ?? [])) {
               obj[v.k] = v.v;
            }

            if (remoteResponse.st) { return obj; }

            if (remoteResponse.ae) {
               obj['__asyncIterator'] = () => thing.target;
            }
         }

         const thing = new RpcThing<any>({
            remoteInvoke: (path: string[], args: unknown[]) => {
               return this.internalRemoteInvoke(path, args, callId);
            }
         }, obj);

         this._finalizerRegistry.register(thing, callId);
         this.log(`Registered finalizer for ${callId}`);

         return thing.target;
      }

      if (resultType === ResultType.Value) {
         return remoteResponse.v;
      }

      if (resultType === ResultType.Array) {
         const deserializedElements = remoteResponse.e.map((e, i) => this.deserializeRemoteResponse({ callId: `${callId}[${i}]`, ...e, }));
         return deserializedElements;
      }

      if (resultType === ResultType.Error) {
         throw new Error(`Remote Error: ${remoteResponse.m}`);
      }

      throw new Error(`Response type ${Object.values(ResultType)[resultType]} not implemented`);
   }

   private serializeResult(callId: string, result: unknown): SerializedResult {
      const type = typeof result;

      if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint' || type === 'undefined') {
         return { callId, t: ResultType.Value, v: result  };
      }

      if (Array.isArray(result)) {

         const values = result.map<SerializedResultType>(v => {
            const result = this.serializeResult(callId, v);
            const { callId: callIdTrash, ...other } = result;
            return other;
         });

         return {
            callId,
            t: ResultType.Array,
            e: values
         };
      }

      if (type === 'object') {

         const staticValues: ObjectResult['vs'] = [];
         const propNames = Object.getOwnPropertyNames(result);
         for(const prop of propNames) {
            const v = (result as any)[prop];
            const vt = typeof v;
            //Symbols are not supported. Just ignore them
            if (vt === 'symbol') { continue; }
            //Ignore the function because the proxy will just try to call it
            if (vt === 'function') { continue; }
            //If the value is an object and it has any dynamic values, we're skip adding it so that it can be called from the proxy
            if (vt === 'object' && !this.isStaticObject(v)) { continue; }
            //If it's all static stuff, return object as-is
            staticValues.push({ k: prop, v: v });
         }

         const ae = (result as any)[Symbol.asyncIterator] ? true : undefined;
         
         return {
            callId,
            t: ResultType.Object,
            st: !ae && staticValues.length === propNames.length,
            vs: staticValues.length ? staticValues : undefined,
            ae
         };
      }

      if (type === 'function') {
         return {
            callId,
            t: ResultType.Function
         };
      }
      
      throw new Error(`Unknown result serializer for type ${type}`);
   }

   private isStaticObject(v: any): boolean {
      for (const prop of Object.getOwnPropertyNames(v)) {
         const cv = v[prop];
         const ct = typeof cv;
         if (ct === 'symbol' || ct === 'function') { return false; }
         if (ct === 'object' && !this.isStaticObject(cv)) { return false; }
      }
      return true;
   }

   private deserializeArgs(callId: string, args: Arg[]): any[] {
      const anyArgs = [];
      for (const a of args) {

         switch (a.t) {
            case ArgType.Array: {
               const elementValues = this.deserializeArgs(callId, a.e);
               anyArgs.push(elementValues);
               break;
            }
            case ArgType.Function: {
               const f = async (...args: any[]) => {
                  const functionMap: Record<string, (...args: any[]) => any> = {};
                  const serializedArgs = this.createArgs(args, functionMap);
                  if (Object.keys(functionMap).length) {
                     throw new Error('Functions within function argument is not supported');
                  }
                  const funcCall: FunctionCall = {
                     t: InvokeType.Function,
                     callId: v4(),
                     functionId: a.id,
                     parentCallId: callId,
                     callArgs: serializedArgs
                  };
                  
                  const response = await this._transport.invoke(funcCall);
                  return response;
               };
               anyArgs.push(f);

               break;
            }
            case ArgType.Object: {
               const value: Record<string, any> = {};
               for (const k of Object.keys(a.p)) {
                  const v = this.deserializeArgs(callId, [a.p[k]]);
                  value[k] = v[0];
               }
               anyArgs.push(value);
               break;
            }
            case ArgType.Value: {
               anyArgs.push(a.v);
               break;
            }
            default: {
               const _: never = a;
            }
         }
      }
      return anyArgs;
   }

   private readonly _childObjects = new Map < string, any > ();
   public async invoke(call: RemoteInvoke): Promise<SerializedResult> {

      if (call.t === InvokeType.Finalize) {
         const hasKey = this._childObjects.has(call.callId);
         if (hasKey) { this._childObjects.delete(call.callId); }

         this.log(`Received finalizer for callId ${call.callId}, hasKey ${hasKey}`);
         
         return this.serializeResult(call.callId, hasKey);
      }

      if (call.t === InvokeType.Function) {
         
         const callFunctions = this._functionMapByCallId.get(call.parentCallId);
         if (!callFunctions) { throw new Error(`Functions for ${call.parentCallId} not found`); }

         const f = callFunctions[call.functionId];
         if (!f) { throw new Error(`Function ${call.functionId} for call ${call.parentCallId} not found`); }

         const args = this.deserializeArgs(call.callId, call.callArgs);

         const rawResult = f(...args);
         const result = await Promise.resolve(rawResult);

         const serializedResult = this.serializeResult(call.callId, result);
         return serializedResult;
      }

      const service: any = call.parentCallId ? this._childObjects.get(call.parentCallId) : this.service;
      let value: any = service;
      try {
         const usedSegments: string[] = [];
         for (const pathSegment of call.callArgs.path) {
            value = pathSegment ? value[pathSegment] : value;
            if (!value) {
               throw new Error(`Property ${pathSegment} does not exist on ${usedSegments.join('.')}`);
            }
            usedSegments.push(pathSegment);
         }

         const args = this.deserializeArgs(call.callId, call.callArgs.args);

         let result = value;
         if (typeof result === 'function') {
            result = result.apply(service, args);
         } else if (args.length) {
            throw new Error('Args given but value was not a function');
         }

         const resolvedResult = await Promise.resolve(result);

         const serialized = this.serializeResult(call.callId, resolvedResult);

         if (serialized.t === ResultType.Object && !serialized.st) {

            if (serialized.ae) {
               this._childObjects.set(call.callId, resolvedResult);
            } else {
               this._childObjects.set(call.callId, resolvedResult);
            }

         } else if (serialized.t === ResultType.Array) {
            for (let i = 0; i < serialized.e.length; i++) {
               const e = serialized.e[i];
               if (e.t !== ResultType.Object && e.t !== ResultType.Function) { continue; }
               if (e.t === ResultType.Object && e.st) { continue; }
               const arrCallId = `${call.callId}[${i}]`;
               this._childObjects.set(arrCallId, resolvedResult[i]);
            }
         } else if (serialized.t === ResultType.Function) {
            this._childObjects.set(call.callId, resolvedResult);
         }

         return serialized;
      } catch (e: any) {
         return {
            callId: call.callId,
            t: ResultType.Error,
            m: e.message
         };
      }
   }

   private log(msg: string) {
      if (!this.verboseLogging) { return; }
      console.debug(msg);
   }

}

export enum InvokeType {
   Call,
   Finalize,
   Function
}

export type RemoteInvoke = Finalize | Call | FunctionCall

/** Triggered when a proxy created as a result of a call's returned value is garbage collected */
interface Finalize {
   t: InvokeType.Finalize,
   callId: string;
}

/** A call to a service method */
interface Call {
   t: InvokeType.Call;
   parentCallId: string | undefined;
   callId: string;
   callArgs: CallArgs;
}

/** A call to a function that was originally passed as an argument to another call */
interface FunctionCall {
   t: InvokeType.Function;
   /** This id of the original call that included the function as an argument */
   parentCallId: string;
   /** The id given to this function by the origin */
   functionId: string;
   /** The id given to this call instance */
   callId: string;
   callArgs: Arg[]
}

export enum ResultType {
   Value,
   Object,
   Array,
   Function,
   Error
}

export type SerializedResultType = ObjectResult | ArrayResult | ValueResult | ErrorResult | FunctionResult;

type SerializedResult = {
   callId: string;
} & SerializedResultType;

interface ObjectResult {
   t: ResultType.Object
   /** True if the object consists of only static property values */
   st: boolean;
   vs?: {
      k: string,
      v: ValueResult
   }[];
   /** Indicates that the object is a AsyncEnumerable */
   ae?: boolean;
}

interface ArrayResult {
   t: ResultType.Array,
   /** The types for each element in the array */
   e: SerializedResultType[]
}

interface ValueResult {
   t: ResultType.Value,
   /** The value */
   v: any
}

interface ErrorResult {
   t: ResultType.Error,
   /** The error message */
   m: string;
}

interface FunctionResult {
   t: ResultType.Function
}

const _example = {
   p1: 'a', //done
   p2: 2, //done
   p3: Symbol(), //throw error
   p4: () => 'a', //tested
   p5: { //done
      pp1: 'whatever.. Same as example just recursive',
   },
   p6: ['a', 1, () => 'q'], //done
   p7: function* () { //done
      yield '1';
   },
   
   asyncGenWithFunctionsInReturnObject: async function* () {
      yield Promise.resolve({
         someFunc: () => { /* */}
      });
   },
   p8: (function* () {
      yield '1';
   })(),
   p9: (async function* () {
      yield await Promise.resolve('1');
   })(),
};
