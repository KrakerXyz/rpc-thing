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

      if (remoteResponse.t === ResultType.Object) {
         const thing = new RpcThing<any>({
            remoteInvoke: (childCall) => {
               return this.internalRemoteInvoke(childCall, remoteResponse.callId);
            }
         });

         return thing.target;
      }

      if (remoteResponse.t === ResultType.Value) {
         return remoteResponse.v;
      }

      throw new Error('Not implemented');
   }

   private serializeResult(callId: string, result: unknown): SerializedResult {
      const type = typeof result;

      if (type === 'string') {
         return {callId, t: ResultType.Value, v: result };
      }

      if (Array.isArray(result)) {
         throw new Error('Arrays not implemented');
      }

      if (type === 'object') {
         
         return { callId, t: ResultType.Object };
      }
      
      throw new Error(`Unknown result serializer for type ${type}`);
   }

   private readonly _childObjects = new Map < string, any > ();
   public async invoke(call: Call): Promise<SerializedResult> {
      let value: any = call.parentCallId ? this._childObjects.get(call.parentCallId) : this.service;
      const usedSegments: string[] = [];
      for (const pathSegment of call.callArgs.path) {
         value = value[pathSegment];
         if (!value) {
            throw new Error(`Property ${pathSegment} does not exist on ${usedSegments.join('.')}`);
         }
         usedSegments.push(pathSegment);
      }

      if (typeof value !== 'function') {
         throw new Error(`${usedSegments.join('.')} is not a function`);
      }

      const result = value(...call.callArgs.args);
      const resolvedResult = await Promise.resolve(result);

      const serialized = this.serializeResult(call.callId, resolvedResult);

      if (serialized.t === ResultType.Object) {
         this._childObjects.set(serialized.callId, resolvedResult);
      }

      return serialized;
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
   Error
}

type SerializedResult = {
   callId: string;
} & (ObjectResult | ArrayResult | ValueResult | ErrorResult);

interface ObjectResult {
   t: ResultType.Object
}

interface ArrayResult {
   t: ResultType.Array,
   /** The types for each element in the array */
   e: Omit<ResultType, 'callId'>[]
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

const _example = {
   p1: 'a',
   p2: 2,
   p3: Symbol(), //throw error
   p4: () => 'a',
   p5: {
      pp1: 'whatever.. Same as example just recursive',
   },
   p6: ['a', 1, () => 'q'],
   p7: function* () {
      yield '1';
   },
   p8: (function* () {
      yield '1';
   })(),
   p9: (async function* () {
      yield await Promise.resolve('1');
   })(),
};
