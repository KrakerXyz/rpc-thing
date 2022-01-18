
import { Service, Transport } from '../../abstractions/index.js';
import { DefaultSerializer, InvokeType, ResultType } from './DefaultSerializer';

describe('DefaultSerializer', () => {
   describe('invoke', () => {

      const createSerializer = <TService extends Service<TService>>(service: TService) => {
         const transport: Transport = {
            invoke: () => Promise.resolve()
         };
         return new DefaultSerializer(transport, service);
      };

      describe('value', () => {

         test('string', async () => {

            const ser = createSerializer({
               test: () => 'string'
            });

            const result = await ser.invoke({
               t: InvokeType.Call,
               callId: '1',
               parentCallId: undefined,
               callArgs: {
                  path: ['test'],
                  args: []
               }
            });

            expect(result.t).toBe(ResultType.Value);
            if (result.t !== ResultType.Value) { return; }
            expect(result.v).toBe('string');

         });

         test('boolean', async () => {

            const ser = createSerializer({
               test: () => true
            });

            const result = await ser.invoke({
               t: InvokeType.Call,
               callId: '1',
               parentCallId: undefined,
               callArgs: {
                  path: ['test'],
                  args: []
               }
            });

            expect(result.t).toBe(ResultType.Value);
            if (result.t !== ResultType.Value) { return; }
            expect(result.v).toBe(true);

         });

         test('number', async () => {

            const ser = createSerializer({
               test: () => 10
            });

            const result = await ser.invoke({
               t: InvokeType.Call,
               callId: '1',
               parentCallId: undefined,
               callArgs: {
                  path: ['test'],
                  args: []
               }
            });

            expect(result.t).toBe(ResultType.Value);
            if (result.t !== ResultType.Value) { return; }
            expect(result.v).toBe(10);

         });

         test('undefined', async () => {

            const ser = createSerializer({
               test: () => undefined
            });

            const result = await ser.invoke({
               t: InvokeType.Call,
               callId: '1',
               parentCallId: undefined,
               callArgs: {
                  path: ['test'],
                  args: []
               }
            });

            expect(result.t).toBe(ResultType.Value);
            if (result.t !== ResultType.Value) { return; }
            expect(result.v).toBe(undefined);

         });
         
      });

      describe('object', () => {

         test('static object', async () => {

            const ser = createSerializer({
               test: () => {
                  return {
                     foo: 'bar'
                  };
               }
            });

            const result = await ser.invoke({
               t: InvokeType.Call,
               callId: '1',
               parentCallId: undefined,
               callArgs: {
                  path: ['test'],
                  args: []
               }
            });

            expect(result.t).toBe(ResultType.Object);
            if (result.t !== ResultType.Object) { return; }
            expect(result.st).toBe(true);
            expect(result.vs?.length).toBe(1);
            if(!result.vs) { return; }
            const v = result.vs[0];
            expect(v.k).toBe('foo');
            expect(v.v).toBe('bar');
         });


      });

   });
});