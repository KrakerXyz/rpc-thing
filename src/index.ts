import { RpcThing } from './RpcThing.js';
import { WebSocketClientTransport } from './transports/WebSocketClientTransport.js';

interface Foo {
   zip: {
      bar(s: string): string;
   };
}

const transport = new WebSocketClientTransport();
const thing = new RpcThing<Foo>(transport);

const result = thing.target.zip.bar('hello world');
console.log('Awaiting result');
Promise.resolve(result).then((r) => {
   console.log('Got result', r);
});
