import type { DownloadStats, UpdateProgress } from '@manga-reader/shared';
import { mainT, type MainKey } from '../i18n';
import { Menu, type MenuItemConstructorOptions, Tray, nativeImage } from 'electron';

export interface TrayStatus {
  downloads: DownloadStats;
  update: UpdateProgress | null;
  online: boolean;
}

/** The short status lines at the top of the tray menu (and its tooltip). */
export function trayStatusLines(language: string, status: TrayStatus): string[] {
  const lines: string[] = [];
  if (!status.online) lines.push(mainT(language, 'tray.offline'));
  if (status.update)
    lines.push(mainT(language, 'tray.checking', { done: status.update.done, total: status.update.total }));
  const { downloading, queued, paused } = status.downloads;
  if (downloading > 0 || queued > 0) lines.push(mainT(language, 'tray.downloading', { count: downloading, queued }));
  else if (paused > 0) lines.push(mainT(language, 'tray.paused', { count: paused }));
  return lines.length > 0 ? lines : [mainT(language, 'tray.idle')];
}

export interface AppTrayDeps {
  iconPath: string;
  language: () => string;
  status: () => TrayStatus;
  open: () => void;
  checkUpdates: () => void;
  pauseDownloads: () => void;
  resumeDownloads: () => void;
  quit: () => void;
}

/**
 * The optional tray icon (docs/BRAINSTORM.md §6.4): open, check now, pause/resume downloads, a short
 * status and quit. It exists only while "close to tray" is on.
 */
export class AppTray {
  private tray: Tray | null = null;

  constructor(private readonly deps: AppTrayDeps) {}

  get enabled(): boolean {
    return this.tray !== null;
  }

  enable(): void {
    if (this.tray) return;
    const size = process.platform === 'darwin' ? 18 : 24;
    const icon = nativeImage.createFromPath(this.deps.iconPath).resize({ width: size, height: size });
    this.tray = new Tray(icon);
    this.tray.on('click', () => this.deps.open());
    this.refresh();
  }

  disable(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  /** Rebuilds the menu from the current status (called when downloads or checks change). */
  refresh(): void {
    if (!this.tray) return;
    const language = this.deps.language();
    const t = (key: MainKey) => mainT(language, key);
    const status = this.deps.status();
    const lines = trayStatusLines(language, status);
    const { downloading, queued, paused } = status.downloads;
    const running = downloading + queued > 0;
    const template: MenuItemConstructorOptions[] = [
      ...lines.map((label) => ({ label, enabled: false })),
      { type: 'separator' },
      { label: t('tray.open'), click: () => this.deps.open() },
      {
        label: t('tray.check'),
        enabled: status.online && status.update === null,
        click: () => this.deps.checkUpdates(),
      },
      running
        ? { label: t('tray.pause'), click: () => this.deps.pauseDownloads() }
        : { label: t('tray.resume'), enabled: paused > 0, click: () => this.deps.resumeDownloads() },
      { type: 'separator' },
      { label: t('tray.quit'), click: () => this.deps.quit() },
    ];
    this.tray.setContextMenu(Menu.buildFromTemplate(template));
    this.tray.setToolTip(`Matane\n${lines.join('\n')}`);
  }
}
