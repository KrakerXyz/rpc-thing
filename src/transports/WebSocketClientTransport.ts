import { ITransport } from '../abstractions/ITransport';

export class WebSocketClientTransport implements ITransport {
   public remoteInvoke(data: unknown): Promise<unknown> {
      console.log(`remoteInvoke: ${JSON.stringify(data)}`);
      return new Promise<unknown>((r) => {
         setTimeout(() => r(true), 1000);
      });
   }
}
