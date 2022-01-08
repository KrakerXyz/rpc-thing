import { Transport } from '../abstractions/Transport';

export class WebSocketClientTransport implements Transport {
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   public invoke(data: unknown): Promise<unknown> {
      throw new Error('not implemented');
   }
}
