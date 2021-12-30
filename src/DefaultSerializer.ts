import { ISerializer } from './abstractions/ISerializer';

export const defaultSerializer: ISerializer = {
   serializeMethodCall(path: string, args: any[]) {
      return {
         serializerName: 'default',
         data: {
            path: path.split('.'),
            args,
         },
      };
   },
};
