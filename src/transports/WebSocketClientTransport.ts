import { ITransport } from '../abstractions/ITransport';

export class WebSocketClientTransport implements ITransport {
   public remoteInvoke(serializedMethod: unknown): Promise<unknown> {
      console.log(`remoteInvoke: ${JSON.stringify(serializedMethod)}`);
      return new Promise<unknown>((r) => {
         setTimeout(() => r(true), 1000);
      });
   }
}
