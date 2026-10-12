import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { describeError } from './errors';

/** The few toasts the app shows. Text arrives already translated. */
export const notify = {
  success: (message: string, description?: string): void => void toast.success(message, { description }),
  info: (message: string, description?: string): void => void toast(message, { description }),
  error: (message: string, description?: string): void => void toast.error(message, { description }),
};

/** Tells the user a failed action (a rejected IPC call): the headline, and the detail under it. */
export function notifyError(error: unknown, t: TFunction): void {
  const { title, detail } = describeError(error, t);
  notify.error(title, detail === title ? undefined : detail);
}
