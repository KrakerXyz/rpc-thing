import { Transport } from './abstractions/index.js';
import { RpcThing } from './RpcThing.js';
import { DefaultSerializer } from './serializers/index.js';

interface Foo {
   zip(): {
      bar: (s: string) => Promise<string>;
   };
}

const service: Foo = {
   zip() {
      return {
         bar: (s) => {
            return Promise.resolve(s);
         }
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

const thing = new RpcThing<Foo>(serializer);

const result = thing.target.zip();
const resolvedResult = await result;

const bar = resolvedResult.bar('hello world');
const barA = await bar;

console.log(barA);

