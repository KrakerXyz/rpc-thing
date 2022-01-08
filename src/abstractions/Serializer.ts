import { CallArgs } from './index.js';

export interface Serializer {
   remoteInvoke(callArgs: CallArgs): Promise<unknown>
}