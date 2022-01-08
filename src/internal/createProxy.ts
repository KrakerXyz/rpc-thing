type ApplyHandler = (path: string, args: any[]) => any;

const pathSymbol = Symbol('Proxy Path');

export function createProxy(path: string, applyHandler: ApplyHandler, base?: any) {
   return new Proxy(createProxyTarget(path, base), {
      get: (target, prop) => {
         if (prop === 'then') {
            return null;
         }
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

function createProxyTarget(path: string, base?: any): any {
   // eslint-disable-next-line @typescript-eslint/no-empty-function
   const target: any = () => {};
   target[pathSymbol] = path;
   if (base) {
      for (const prop of Object.getOwnPropertyNames(base)) {
         const v = base[prop];
         target[prop] = v;
      }
   }
   return target;
}
