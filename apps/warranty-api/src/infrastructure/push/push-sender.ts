/** The only thing reminder code knows about push. Adapters live next to this file. */
export type PushMessage = {
  token: string;
  title: string;
  body: string;
  url: string;
};

export interface PushSender {
  /** Sends best-effort. Tokens the provider says are dead come back so the caller can delete them. */
  send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }>;
}

export const PUSH_SENDER = Symbol('PushSender');
