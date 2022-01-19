
export interface Serializer {
   remoteInvoke(path: string[], args: unknown[]): Promise<unknown>
}