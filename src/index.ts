

export * from './abstractions/index.js';
export * from './serializers/index.js';
export * from './RpcThing.js';

// import { Transport } from './abstractions/Transport.js';
// import { RpcThing } from './RpcThing.js';
// import { DefaultSerializer } from './serializers/index.js';

// const service = {
//    test() {
//       return {
//          subscribe(callback: (v: any) => void) {
//             let count = 0;
//             const iv = setInterval(() => {
//                count++;
//                callback(count);
//             },1000);

//             return {
//                unsubscribe() {
//                   clearInterval(iv);
//                }
//             };
//          }
//       };
//    }
// };

// const transportClient: Transport = {
//    async invoke(data) {
//       const dataClone = JSON.parse(JSON.stringify(data));
//       const result = await serializer.invoke(dataClone);
//       return result;
//    }
// };

// const serializer = new DefaultSerializer(transportClient, service);

// const thing = new RpcThing<typeof service>(serializer);

// const start = performance.now();

// thing.target.test().then(obs => {
//    const sub = obs.subscribe(v => {
//       console.log(`In callback - ${v}`);
//    });

//    setTimeout(() => {
//       console.log('unsubscribing');
//       sub.unsubscribe();
//    }, 3000);
// });

// console.log(`Finished in ${Math.round((performance.now() - start) * 100)/100} ms`);