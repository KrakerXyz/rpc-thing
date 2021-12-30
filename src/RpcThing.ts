import { ISerializer } from './abstractions/ISerializer';
import { ITransport } from './abstractions/ITransport';
import { defaultSerializer } from './DefaultSerializer.js';
import { createProxy } from './internal/createProxy.js';

export class RpcThing<T> {
   private readonly _serializer: ISerializer = defaultSerializer;
   private readonly _proxy: any;

   public constructor(private readonly _transport: ITransport) {
      this._proxy = createProxy('', (path, args) => {
         const serialized = this._serializer.serializeMethodCall(path, args);
         const prom = this._transport.remoteInvoke(serialized);
         return prom;
      });
   }

   public get target(): T {
      return this._proxy;
   }
}
