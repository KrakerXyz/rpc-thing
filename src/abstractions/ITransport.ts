export interface ITransport {
   remoteInvoke(serializedMethod: unknown): Promise<unknown>;
}
