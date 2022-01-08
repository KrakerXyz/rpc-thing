import { Transport } from './abstractions/index.js';
import { RpcThing } from './RpcThing.js';
import { DefaultSerializer } from './serializers/index.js';

const service = {
   [Symbol()]: 'a',
   zip() {
      return {
         staticString: 'zip().staticString',
         bar: (s: string) => {
            return s;
         }
      };
   },
   staticOnlyMethod() {
      return {
         static: 0
      };
   }
};

const transportClient: Transport = {
   async invoke(data) {
      const result = await serializer.invoke(data as any);
      return result;
   }
};

const serializer = new DefaultSerializer(transportClient, service);

const thing = new RpcThing<typeof service>(serializer);

const zipResult = await thing.target.zip();
console.log(zipResult.staticString);

const zipBarResult = await zipResult.bar('zip().bar');
console.log(zipBarResult);

const staticOnlyMethodResult = await thing.target.staticOnlyMethod();
console.log('staticOnlyMethodResult().static: ' + staticOnlyMethodResult.static);
