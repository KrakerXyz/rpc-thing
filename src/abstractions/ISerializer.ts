export interface ISerializer<T = unknown> {
   serializeMethodCall(path: string, args: any[]): T;
}
