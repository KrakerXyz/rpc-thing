export interface ISerializer {
   serializeMethodCall(path: string, args: any[]): SerializedMessage;
}

export interface SerializedMessage {
   serializerName: string;
   data: unknown;
}
