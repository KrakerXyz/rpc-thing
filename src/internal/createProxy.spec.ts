import { createProxy } from './createProxy';

test('return existing proxy for subsequent property calls', () => {
   const prox = createProxy('', () => 0);
   const t1 = prox.foo;
   const t2 = prox.foo;
   expect(t2).toBe(t1);
});

test('throw error when a symbol is used for property index', () => {
   const prox = createProxy('', () => 0);
   expect(() => prox[Symbol()]).toThrow();
});

test('nested path', () => {
   let path = '-initial-';
   const prox = createProxy('', (funcPath) => (path = funcPath));
   prox.foo.bar();
   expect(path).toEqual('foo.bar');
});

test('handler include args', () => {
   let args: any[] = [];
   const prox = createProxy('', (_, a) => (args = a));
   const arg1 = {};
   prox(1, arg1);
   expect(args.length).toEqual(2);
   expect(args[0]).toEqual(1);
   expect(args[1]).toBe(arg1);
});

test('can invoke root', () => {
   let path = '-initial-';
   const prox = createProxy('', (funcPath) => (path = funcPath));
   prox();
   expect(path).toEqual('');
});
