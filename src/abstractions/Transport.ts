
export interface Transport {
   invoke(data: unknown): Promise<unknown>;
   /** Sets a callback that that can attempt to handle message received that are not in response to a call/reply. Returns a value indicating whether the message was handled or not */
   setPushHandler?(handler: PushHandler): void;
}

export type PushHandler = (data: unknown) => { handled: boolean, result: unknown };