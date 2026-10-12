/*
 * What the main process says to the user itself: the tray menu, the notifications, the status line of Discord. The
 * renderer has its own catalogs (renderer/src/i18n/locales). `id` is typed against `en`, so a missing or extra key
 * is a compile error; `index.test.ts` also checks the placeholders. A count-driven text has `_one` and `_other`.
 */
export const en = {
  'tray.open': 'Open Matane',
  'tray.check': 'Check for updates now',
  'tray.pause': 'Pause downloads',
  'tray.resume': 'Resume downloads',
  'tray.quit': 'Quit',
  'tray.idle': 'Nothing running',
  'tray.offline': 'Offline',
  'tray.checking': 'Checking for updates {{done}}/{{total}}',
  'tray.downloading': 'Downloading {{count}} · {{queued}} in queue',
  'tray.paused_one': '{{count}} download paused',
  'tray.paused_other': '{{count}} downloads paused',
  'notify.newChapters.title_one': '{{count}} new chapter from {{manga}} manga',
  'notify.newChapters.title_other': '{{count}} new chapters from {{manga}} manga',
  'notify.newChapters.more': '{{shown}} and {{count}} more',
  'updater.ready.title': 'Matane {{version}} is ready',
  'updater.ready.body': 'Restart Matane to update.',
  'updater.available.title': 'Matane {{version}} is available',
  'updater.available.packageManager': 'Update it through your package manager.',
  'updater.available.about': 'See Settings → About.',
  'discord.reading': 'Reading',
  'discord.readingManga': 'Reading manga',
} as const;

export type CatalogKey = keyof typeof en;

export const id: Record<CatalogKey, string> = {
  'tray.open': 'Buka Matane',
  'tray.check': 'Cek update sekarang',
  'tray.pause': 'Jeda download',
  'tray.resume': 'Lanjutkan download',
  'tray.quit': 'Keluar',
  'tray.idle': 'Tidak ada yang berjalan',
  'tray.offline': 'Offline',
  'tray.checking': 'Mengecek update {{done}}/{{total}}',
  'tray.downloading': 'Mengunduh {{count}} · {{queued}} di antrean',
  'tray.paused_one': '{{count}} download dijeda',
  'tray.paused_other': '{{count}} download dijeda',
  'notify.newChapters.title_one': '{{count}} chapter baru dari {{manga}} manga',
  'notify.newChapters.title_other': '{{count}} chapter baru dari {{manga}} manga',
  'notify.newChapters.more': '{{shown}} dan {{count}} lainnya',
  'updater.ready.title': 'Matane {{version}} siap dipasang',
  'updater.ready.body': 'Mulai ulang Matane untuk memperbarui.',
  'updater.available.title': 'Matane {{version}} tersedia',
  'updater.available.packageManager': 'Perbarui lewat package manager kamu.',
  'updater.available.about': 'Lihat Setting → Tentang.',
  'discord.reading': 'Membaca',
  'discord.readingManga': 'Sedang membaca manga',
};
