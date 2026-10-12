import { describe, expect, it } from 'vitest';
import {
  AppError,
  MAIN_ERROR_KEYS,
  codeForExtensionError,
  decodeIpcError,
  encodeIpcError,
  toAppErrorData,
} from './errors';

describe('app errors', () => {
  it('round-trip through the Electron invoke message', () => {
    const encoded = encodeIpcError(new AppError('http', 'HTTP 503 for https://x', 503));
    // What the renderer actually receives from ipcRenderer.invoke:
    const received = new Error(`Error invoking remote method 'sources.browse': Error: ${encoded.message}`);
    expect(decodeIpcError(received)).toEqual({ code: 'http', message: 'HTTP 503 for https://x', status: 503 });
  });

  it('degrades unknown errors to code "unknown"', () => {
    expect(decodeIpcError(new Error('boom'))).toEqual({ code: 'unknown', message: 'boom' });
    expect(toAppErrorData({ code: 'nope', message: 'x' })).toEqual({ code: 'unknown', message: '[object Object]' });
  });

  it('maps SDK error names to codes', () => {
    expect(codeForExtensionError('CloudflareError')).toBe('cloudflare');
    expect(codeForExtensionError('TypeError')).toBe('extension');
    expect(codeForExtensionError(undefined)).toBe('extension');
  });

  it('carries a text key and its values across the hop, in English too', () => {
    const error = AppError.keyed('repo', 'Not a URL: x', 'repo.notUrl', { input: 'x' });
    const received = new Error(`Error invoking remote method 'repos.add': Error: ${encodeIpcError(error).message}`);
    expect(decodeIpcError(received)).toEqual({
      code: 'repo',
      message: 'Not a URL: x',
      key: 'repo.notUrl',
      params: { input: 'x' },
    });
  });

  it('drops a key it does not know, so the English message is shown', () => {
    expect(toAppErrorData({ code: 'repo', message: 'x', key: 'repo.fromTheFuture', params: { a: 1 } })).toEqual({
      code: 'repo',
      message: 'x',
    });
    expect(toAppErrorData({ code: 'repo', message: 'x', key: 'repo.notUrl', params: { a: {} } })).toEqual({
      code: 'repo',
      message: 'x',
      key: 'repo.notUrl',
    });
  });

  it('lists each key once', () => {
    expect(new Set(MAIN_ERROR_KEYS).size).toBe(MAIN_ERROR_KEYS.length);
  });
});
