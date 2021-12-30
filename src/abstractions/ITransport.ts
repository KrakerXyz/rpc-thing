import { SerializedMessage } from './ISerializer';

export interface ITransport {
   remoteInvoke(message: SerializedMessage): Promise<unknown>;
}
