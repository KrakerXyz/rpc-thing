import { ISerializer } from './abstractions/ISerializer';

export const defaultSerializer: ISerializer<SerializedMethodCall> = {
   serializeMethodCall(path: string, args: any[]) {
      return {
         path: path.split('.'),
         args,
      };
   },
};

export interface SerializedMethodCall {
   path: string[];
   args: any[];
}
