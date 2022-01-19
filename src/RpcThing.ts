import { Serializer, Service, PromisfiedService } from './abstractions/index.js';
import { createProxy } from './internal/createProxy.js';

export class RpcThing<TService extends Service<TService>> {
   private readonly _proxy: any;

   public constructor(private readonly _serializer: Serializer, base?: any) {
      this._proxy = createProxy('', (path, args) => {
         const result = this._serializer.remoteInvoke(path.split('.'), args);
         return result;
      }, base);
   }

   public get target(): PromisfiedService<TService> {
      return this._proxy;
   }
}
