import { type AppErrorData, decodeIpcError } from '@manga-reader/shared/errors';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

export type { AppErrorData };

/** Typed error from a rejected IPC call (codes survive the hop, see shared/errors). */
export function appError(error: unknown): AppErrorData {
  return decodeIpcError(error);
}

/**
 * Short, translated headline for an error plus the detail for the curious: the sentence in the user's language when main
 * sent a key we know (`MAIN_ERROR_KEYS`), otherwise the raw English message.
 */
export function describeError(
  error: unknown,
  t: TFunction,
): { code: AppErrorData['code']; title: string; detail: string } {
  const data = appError(error);
  const title =
    data.code === 'http' && data.status !== undefined
      ? t('errors.httpStatus', { status: data.status })
      : t(`errors.${data.code}`);
  const detail = data.key ? t(`errors.main.${data.key}`, { ...data.params, defaultValue: data.message }) : data.message;
  return { code: data.code, title, detail };
}

/** `describeError` for a component. */
export function useErrorText(error: unknown): { code: AppErrorData['code']; title: string; detail: string } {
  const { t } = useTranslation();
  return describeError(error, t);
}
