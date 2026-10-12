// Typed errors that survive every hop (sandbox → extension host → main → renderer). Zod-free so the
// extension host and preload can import it cheaply.

export const APP_ERROR_CODES = [
  // From the extension or its HTTP traffic
  'network',
  'http',
  'cloudflare',
  'rate_limited',
  'not_found',
  'parse',
  'extension',
  'not_implemented',
  // From the sandbox
  'timeout',
  'interrupted',
  'memory',
  // From the host plumbing
  'host_crashed',
  'cancelled',
  'not_installed',
  // Extension repositories and installs
  'repo',
  // Trackers: not connected, login expired, or the tracker said no
  'tracker',
  // Adult sources while they are hidden (docs/BRAINSTORM.md §6.6)
  'nsfw_hidden',
  'unknown',
] as const;
export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/**
 * Errors the main process raises with a text of its own (ADR 0042). `message` stays the English sentence for logs and
 * tests; the renderer shows `errors.main.<key>` (with the `params`) in the user's language and falls back on the
 * message when it does not know the key. Add a text to `en.json` and `id.json` for every key (a test checks).
 */
export const MAIN_ERROR_KEYS = [
  'repo.otherRepository',
  'repo.shadowedByFolder',
  'repo.fileMissing',
  'repo.installExpired',
  'repo.busy',
  'repo.notUrl',
  'repo.httpsOnly',
  'repo.noLogin',
  'repo.alreadyAdded',
  'repo.noKeyToTrust',
  'repo.noIndex',
  'repo.notUtf8',
  'repo.tooLarge',
] as const;
export type MainErrorKey = (typeof MAIN_ERROR_KEYS)[number];
export type MainErrorParams = Record<string, string | number>;

export interface AppErrorData {
  code: AppErrorCode;
  message: string;
  /** HTTP status for `http` errors. */
  status?: number;
  /** A text the renderer can show in the user's language, see `MAIN_ERROR_KEYS`. */
  key?: MainErrorKey;
  params?: MainErrorParams;
}

export class AppError extends Error {
  override name = 'AppError';

  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly status?: number,
    readonly key?: MainErrorKey,
    readonly params?: MainErrorParams,
  ) {
    super(message);
  }

  /** An error whose text the renderer translates: `message` is the English version of `key`. */
  static keyed(code: AppErrorCode, message: string, key: MainErrorKey, params?: MainErrorParams): AppError {
    return new AppError(code, message, undefined, key, params);
  }

  toJSON(): AppErrorData {
    return {
      code: this.code,
      message: this.message,
      ...(this.status !== undefined && { status: this.status }),
      ...(this.key !== undefined && { key: this.key, ...(this.params !== undefined && { params: this.params }) }),
    };
  }

  static from(data: AppErrorData): AppError {
    return new AppError(data.code, data.message, data.status, data.key, data.params);
  }
}

// Error names thrown inside extensions (SDK errors) → app codes.
const EXTENSION_ERROR_CODES: Record<string, AppErrorCode> = {
  NetworkError: 'network',
  HttpError: 'http',
  CloudflareError: 'cloudflare',
  RateLimitedError: 'rate_limited',
  NotFoundError: 'not_found',
  ParseError: 'parse',
  NotImplementedError: 'not_implemented',
};

export function codeForExtensionError(name: string | undefined): AppErrorCode {
  return (name && EXTENSION_ERROR_CODES[name]) || 'extension';
}

const isCode = (value: unknown): value is AppErrorCode =>
  typeof value === 'string' && (APP_ERROR_CODES as readonly string[]).includes(value);
const isKey = (value: unknown): value is MainErrorKey =>
  typeof value === 'string' && (MAIN_ERROR_KEYS as readonly string[]).includes(value);
const isParams = (value: unknown): value is MainErrorParams =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((v) => typeof v === 'string' || typeof v === 'number');

export function toAppErrorData(error: unknown): AppErrorData {
  if (error instanceof AppError) return error.toJSON();
  if (typeof error === 'object' && error !== null && isCode((error as AppErrorData).code)) {
    const { code, message, status, key, params } = error as AppErrorData;
    return {
      code,
      message: String(message),
      ...(typeof status === 'number' && { status }),
      // A key this build does not know (a newer main) is dropped: the English message is shown instead.
      ...(isKey(key) && { key, ...(isParams(params) && { params }) }),
    };
  }
  if (error instanceof Error) return { code: 'unknown', message: error.message };
  return { code: 'unknown', message: String(error) };
}

// Electron only carries `message` across `ipcRenderer.invoke`, so the payload rides inside it.
const IPC_MARKER = 'AppError:';

export function encodeIpcError(error: unknown): Error {
  return new Error(`${IPC_MARKER}${JSON.stringify(toAppErrorData(error))}`);
}

/** Recovers the typed error from a rejected `ipc.invoke` (the message is prefixed by Electron). */
export function decodeIpcError(error: unknown): AppErrorData {
  const message = error instanceof Error ? error.message : String(error);
  const at = message.indexOf(IPC_MARKER);
  if (at >= 0) {
    try {
      return toAppErrorData(JSON.parse(message.slice(at + IPC_MARKER.length)));
    } catch {
      // fall through
    }
  }
  return { code: 'unknown', message };
}
