import type { NetworkFailure } from '@manga-reader/shared';

/** What went wrong with a request, as a code the renderer translates, from Chromium's `net::ERR_...` text. */
const FAILURES: [RegExp, NetworkFailure][] = [
  [/PROXY_AUTH|PROXY_CERTIFICATE/, 'proxy_auth'],
  [/PROXY_CONNECTION_FAILED|TUNNEL_CONNECTION_FAILED|SOCKS_CONNECTION/, 'proxy'],
  [/NAME_NOT_RESOLVED|NAME_RESOLUTION_FAILED|DNS_/, 'dns'],
  [/CONNECTION_REFUSED/, 'refused'],
  [/TIMED_OUT|TIMEOUT|aborted due to timeout/i, 'timeout'],
  [/INTERNET_DISCONNECTED|NETWORK_CHANGED|ADDRESS_UNREACHABLE/, 'offline'],
  [/CERT_|SSL_|TLS/, 'tls'],
  [/CONNECTION_RESET|CONNECTION_CLOSED|EMPTY_RESPONSE/, 'reset'],
];

/** The cause of a failed request; `unknown` when the error is not one we recognise. */
export function classifyNetworkError(error: unknown): NetworkFailure {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  for (const [pattern, failure] of FAILURES) if (pattern.test(message)) return failure;
  return 'unknown';
}

/** The cause of a response that is not a success: only a proxy that wants a login is told apart. */
export function classifyStatus(status: number): NetworkFailure | null {
  return status === 407 ? 'proxy_auth' : null;
}
