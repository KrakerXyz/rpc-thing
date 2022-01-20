
import { RpcThing, Transport, DefaultSerializer, PromisfiedService } from './index';

function createThing<T>(service: T): PromisfiedService<T> {

   const transportClient: Transport = {
      async invoke(data) {
         const dataClone = JSON.parse(JSON.stringify(data));
         const result = await serializer.invoke(dataClone);
         return result;
      }
   };
   const serializer = new DefaultSerializer(transportClient, service);
      
      
   const thing = new RpcThing<typeof service>(serializer);

   return thing.target;
}


test('symbol property access throw error', () => {
   const sym = Symbol();
   const service = {
      [sym]: 'foo'
   };

   const proxy = createThing(service);

   expect(() => proxy[sym]).toThrow();
});

test('simple string property', async () => {
   const service = {
      test: 'a'
   };
   const proxy = createThing(service);
   const result = await proxy.test();
   expect(result).toBe('a');
});

test('simple number property', async () => {
   const service = {
      test: 1
   };
   const proxy = createThing(service);
   const result = await proxy.test();
   expect(result).toBe(1);
});

test('simple boolean property', async () => {
   const service = {
      test: true
   };
   const proxy = createThing(service);
   const result = await proxy.test();
   expect(result).toBe(true);
});

test('static only method', async () => {
   const service = {
      staticOnlyMethod() {
         return {
            static: 0
         };
      }
   };
   const proxy = createThing(service);
   const result = await proxy.staticOnlyMethod();
   expect(result.static).toBe(0);
});

test('nested functions', async () => {
   const service = {
      foo() {
         return {
            bar() {
               return 'fizz';
            }
         };
      }
   };

   const proxy = createThing(service);
   const foo = await proxy.foo();
   const bar = await foo.bar();
   expect(bar).toBe('fizz');
});

test('simple object', async () => {
   const service = {
      foo: {
         bar: 'fizz'
      }
   };
   const proxy = createThing(service);
   const foo = await proxy.foo();
   expect(foo.bar).toBe('fizz');
});

test('simple array', async () => {
   const service = {
      arr: [1, 'a', true]
   };
   const proxy = createThing(service);
   const result = await proxy.arr();
   expect(result).toEqual([1, 'a', true]);
});

test('array with func', async () => {
   const service = {
      arr: [() => 'foo']
   };
   const proxy = createThing(service);
   const result = await proxy.arr();
   const funcResult = await result[0]();
   expect(funcResult).toBe('foo');
});

test('async gen', async () => {
   const service = {
      async *foo() {
         yield await Promise.resolve(1);
         yield await Promise.resolve(2);
         yield await Promise.resolve(3);
      }
   };
   const proxy = createThing(service);
   const ag = await proxy.foo();
   const values: any[] = [];
   for await (const v of ag) {
      values.push(v);
   }
   expect(values).toEqual([1, 2, 3]);
});

test('function returned from function', async () => {
   const service = {
      getFunc() {
         return () => {
            return 'test';
         };
      }
   };

   const proxy = createThing(service);
   const inner = await proxy.getFunc();
   const result = await inner();
   expect(result).toBe('test');
});

test('func call with string arg', async () => {
   const service = {
      foo(v: string) {
         return `hello ${v}`;
      }
   };
   const proxy = createThing(service);
   const result = await proxy.foo('test');
   expect(result).toBe('hello test');
});

test('func call with simple array', async () => {
   const service = {
      foo(n: number[]) {
         return n.map(x => x*10);
      }
   };
   const proxy = createThing(service);
   const result = await proxy.foo([1,2,3]);
   expect(result).toEqual([10, 20, 30]);
});

test('func argument', async () => {
   const service = {
      test(callback: (n: number) => void) {
         callback(100);
         callback(200);
      }
   };

   const proxy = createThing(service);

   const result = await new Promise(r => {
      let count = 0;
      proxy.test(cb => {
         count+= cb;
         if (count === 300) { r(count); }
      });
   });

   expect(result).toBe(300);
});

test('func argument with object response', async () => {
   const service = {
      test(callback: (n: any) => void) {
         callback({test: 'foo'});
      }
   };

   const proxy = createThing(service);

   const result = await new Promise(r => {
      proxy.test(cb => {
         r(cb);
      });
   });

   expect(result).toEqual({ test: 'foo' });
});