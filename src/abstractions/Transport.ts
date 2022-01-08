
export interface Transport {
   invoke(data: unknown): Promise<unknown>;
}