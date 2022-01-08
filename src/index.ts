import { Transport } from './abstractions/index.js';
import { RpcThing } from './RpcThing.js';
import { DefaultSerializer } from './serializers/index.js';

const service = {
   //We need a TS type check to error here
   [Symbol()]: 'a',
   propString: 'a',
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
   },
   methodStringReturn: () => 'blah',
   propObject: {
      objectProp: false
   },
   propArrSimple: ['a', 1, true],
   propArrWithFunc: [() => 'arrFunc']
};

const transportClient: Transport = {
   async invoke(data) {
      const dataClone = JSON.parse(JSON.stringify(data));
      const result = await serializer.invoke(dataClone);
      return result;
   }
};

const serializer = new DefaultSerializer(transportClient, service);

const thing = new RpcThing<typeof service>(serializer);

const start = performance.now();

const zipResult = await thing.target.zip();
console.log('zip().staticString: ' + zipResult.staticString);

const zipBarResult = await zipResult.bar('hello world');
console.log('zio().bar(): ' + zipBarResult);

const staticOnlyMethodResult = await thing.target.staticOnlyMethod();
console.log('staticOnlyMethodResult().static: ' + staticOnlyMethodResult.static);

const propStringResult = await thing.target.propString();
console.log('propString: ' + propStringResult);

const methodStringReturnResult = await thing.target.methodStringReturn();
console.log('methodStringReturn: ' + methodStringReturnResult);

const propObjectResult = await thing.target.propObject();
console.log('propObject: ' + JSON.stringify(propObjectResult));

const propArrSimpleResult = await thing.target.propArrSimple();
console.log('propArrSimple: ' + JSON.stringify(propArrSimpleResult));

const propArrWithFuncResult = await thing.target.propArrWithFunc();
const propArrWithFuncFunc = propArrWithFuncResult[0];
const propArrWithFuncFuncResult = await propArrWithFuncFunc();
console.log('propArrWithFunc[0](): ' + propArrWithFuncFuncResult);

console.log(`Finished in ${Math.round((performance.now() - start) * 100)/100} ms`);