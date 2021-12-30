type ApplyHandler = (path: string, args: any[]) => any;

const pathSymbol = Symbol('Proxy Path');
export function createProxy(path: string, applyHandler: ApplyHandler) {
   return new Proxy(createProxyTarget(path), {
      get: (target, prop) => {
         return getHandler(target, prop, applyHandler);
      },
      apply: (target, _thisArg, args) => {
         const path = target[pathSymbol];
         const result = applyHandler(path, args);
         return result;
      },
   });
}

function getHandler(target: any, prop: string | symbol, applyHandler: ApplyHandler): any {
   if (typeof prop === 'symbol') {
      throw new Error('Using a Symbol to access a function/property is not supported');
   }
   const path = target[pathSymbol];
   const fullPath = joinPath(path, prop);
   if (target[prop]) {
      return target[prop];
   }

   const childProxy: any = createProxy(fullPath, applyHandler);
   target[prop] = childProxy;
   return childProxy;
}

function joinPath(left: string, right: string) {
   if (!left) {
      return right;
   }
   return `${left}.${right}`;
}

function createProxyTarget(path: string): any {
   // eslint-disable-next-line @typescript-eslint/no-empty-function
   const target: any = () => {};
   target[pathSymbol] = path;
   return target;
}
