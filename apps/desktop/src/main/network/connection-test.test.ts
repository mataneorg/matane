import { describe, expect, it } from 'vitest';
import { classifyNetworkError, classifyStatus } from './connection-test';

describe('classifyNetworkError', () => {
  it.each([
    ['net::ERR_PROXY_CONNECTION_FAILED', 'proxy'],
    ['net::ERR_TUNNEL_CONNECTION_FAILED', 'proxy'],
    ['net::ERR_NAME_NOT_RESOLVED', 'dns'],
    ['net::ERR_CONNECTION_REFUSED', 'refused'],
    ['net::ERR_CONNECTION_TIMED_OUT', 'timeout'],
    ['net::ERR_INTERNET_DISCONNECTED', 'offline'],
    ['net::ERR_CERT_AUTHORITY_INVALID', 'tls'],
    ['net::ERR_SSL_PROTOCOL_ERROR', 'tls'],
    ['net::ERR_CONNECTION_RESET', 'reset'],
    ['something unheard of', 'unknown'],
  ])('%s is %s', (message, failure) => {
    expect(classifyNetworkError(new Error(message))).toBe(failure);
  });

  it('tells a proxy that refuses the login from one that is down', () => {
    expect(classifyNetworkError(new Error('net::ERR_PROXY_AUTH_UNSUPPORTED'))).toBe('proxy_auth');
  });

  it('reads the timeout of an AbortSignal', () => {
    const error = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(classifyNetworkError(error)).toBe('timeout');
  });

  it('copes with a value that is not an Error', () => {
    expect(classifyNetworkError('net::ERR_NAME_NOT_RESOLVED')).toBe('dns');
    expect(classifyNetworkError(undefined)).toBe('unknown');
  });
});

describe('classifyStatus', () => {
  it('flags only 407', () => {
    expect(classifyStatus(407)).toBe('proxy_auth');
    expect(classifyStatus(200)).toBeNull();
    expect(classifyStatus(503)).toBeNull();
  });
});
