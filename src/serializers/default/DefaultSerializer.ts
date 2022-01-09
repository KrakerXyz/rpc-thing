import { __generator } from 'tslib';
import { v4 } from 'uuid';
import { CallArgs, Transport, Serializer, Service } from '../../abstractions/index.js';
import { RpcThing } from '../../RpcThing.js';

export class DefaultSerializer<TService extends Service<TService>> implements Serializer {
   public constructor(private readonly _transport: Transport, private readonly service: TService) { }

   public remoteInvoke(callArgs: CallArgs): Promise<unknown> {
      const result = this.internalRemoteInvoke(callArgs, undefined) as any;
      return result;
   }

   private async internalRemoteInvoke(callArgs: CallArgs, parentCallId: string | undefined): Promise<unknown> {

      const call: Call = {
         parentCallId,
         callId: v4(),
         callArgs
      };

      const remoteResponse = await this._transport.invoke(call) as SerializedResult;

      const result = this.deserializeRemoteResponse(remoteResponse);

      return result;
 
   }

   private deserializeRemoteResponse(remoteResponse: SerializedResult): any {
      if (remoteResponse.t === ResultType.Object || remoteResponse.t === ResultType.Function) {

         const obj: any = {};
         if (remoteResponse.t === ResultType.Object) {
            for (const v of (remoteResponse.vs ?? [])) {
               obj[v.k] = v.v;
            }

            if (remoteResponse.ae) {
               obj['__asyncIterator'] = () => thing.target;
            }

            if (remoteResponse.st) { return obj; }
         }

         const thing = new RpcThing<any>({
            remoteInvoke: (childCall) => {
               return this.internalRemoteInvoke(childCall, remoteResponse.callId);
            }
         }, obj);

         return thing.target;
      }

      if (remoteResponse.t === ResultType.Value) {
         return remoteResponse.v;
      }

      if (remoteResponse.t === ResultType.Array) {
         const deserializedElements = remoteResponse.e.map((e, i) => this.deserializeRemoteResponse({ callId: `${remoteResponse.callId}[${i}]`, ...e, }));
         return deserializedElements;
      }

      if (remoteResponse.t === ResultType.Error) {
         throw new Error(`Remote Error: ${remoteResponse.m}`);
      }

      throw new Error(`Response type ${Object.values(ResultType)[(remoteResponse as any).t]} not implemented`);
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
            if (vt === 'symbol' || vt === 'function') { continue; }
            if (vt === 'object' && !this.isStaticObject(v)) { continue; }
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

   private readonly _childObjects = new Map < string, any > ();
   public async invoke(call: Call): Promise<SerializedResult> {
      console.log('Invoking: ' + call.callArgs.path.join('.'));
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

         let result = value;
         if (typeof result === 'function') {
            result = result.apply(service, call.callArgs.args);
         } else if (call.callArgs.args.length) {
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

}

interface Call {
   parentCallId: string | undefined;
   callId: string;
   callArgs: CallArgs;
}

enum ResultType {
   Value,
   Object,
   Array,
   Function,
   Error
}

type SerializedResultType = ObjectResult | ArrayResult | ValueResult | ErrorResult | FunctionResult;

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
