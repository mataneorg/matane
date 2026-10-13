import { defineConfig, type DefaultTheme } from 'vitepress';

const repo = 'https://github.com/mataneorg/matane';

// Shared by every page under /docs/, /download, /changelogs, /contribute and /extensions/, so the reader keeps
// the same menu wherever they are, as on mihon.app.
const docsSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Download', link: '/download' },
  { text: 'Changelogs', link: '/changelogs' },
  { text: 'Contribute', link: '/contribute' },
  {
    text: 'Getting started',
    items: [
      { text: 'Introduction', link: '/docs/' },
      { text: 'Getting started', link: '/docs/guides/getting-started' },
      { text: 'Install and updating', link: '/docs/guides/install' },
    ],
  },
  {
    text: 'Frequently Asked Questions',
    collapsed: false,
    items: [
      { text: 'General', link: '/docs/faq/general' },
      { text: 'Library', link: '/docs/faq/library' },
      { text: 'Updates', link: '/docs/faq/updates' },
      {
        text: 'Browse',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/docs/faq/browse/' },
          { text: 'Extensions', link: '/docs/faq/browse/extensions' },
        ],
      },
      { text: 'Downloads', link: '/docs/faq/downloads' },
      { text: 'Reader', link: '/docs/faq/reader' },
      { text: 'Tracking', link: '/docs/faq/tracking' },
      { text: 'Settings', link: '/docs/faq/settings' },
      { text: 'Storage', link: '/docs/faq/storage' },
    ],
  },
  {
    text: 'Guides',
    collapsed: false,
    items: [
      {
        text: 'Troubleshooting',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/docs/guides/troubleshooting/' },
          { text: 'Common issues', link: '/docs/guides/troubleshooting/common-issues' },
          { text: 'Diagnosis', link: '/docs/guides/troubleshooting/diagnosis' },
        ],
      },
      { text: 'Extensions and repositories', link: '/docs/guides/extensions' },
      { text: 'Source migration', link: '/docs/guides/source-migration' },
      { text: 'Library', link: '/docs/guides/library' },
      { text: 'Categories', link: '/docs/guides/categories' },
      { text: 'New chapters', link: '/docs/guides/updates' },
      { text: 'Reader', link: '/docs/guides/reader' },
      { text: 'Reader settings', link: '/docs/guides/reader-settings' },
      { text: 'Downloads and offline', link: '/docs/guides/downloads' },
      { text: 'Local files', link: '/docs/guides/local' },
      { text: 'Trackers', link: '/docs/guides/tracking' },
      { text: 'Incognito', link: '/docs/guides/incognito' },
      { text: 'Statistics', link: '/docs/guides/statistics' },
      { text: 'Backups', link: '/docs/guides/backups' },
      { text: 'Network', link: '/docs/guides/network' },
      { text: 'Command palette', link: '/docs/guides/command-palette' },
      { text: 'Settings reference', link: '/docs/guides/settings' },
    ],
  },
  {
    text: 'For extension authors',
    items: [
      { text: 'Writing extensions', link: '/extensions/' },
      { text: 'Templates (Madara, MangaThemesia)', link: '/extensions/templates' },
      { text: 'Publishing a repository', link: '/extensions/repository' },
    ],
  },
];

// Published to GitHub Pages at https://mataneorg.github.io/matane/ (.github/workflows/docs.yml).
export default defineConfig({
  title: 'Matane',
  description: 'Open-source desktop manga reader with a sandboxed extension system',
  base: '/matane/',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', type: 'image/png', href: '/matane/logo.png' }]],
  themeConfig: {
    logo: '/logo.png',
    nav: [
      { text: 'Download', link: '/download', activeMatch: '^/download' },
      { text: 'Changelogs', link: '/changelogs', activeMatch: '^/changelogs' },
      { text: 'Docs', link: '/docs/guides/getting-started', activeMatch: '^/docs/' },
      { text: 'Contribute', link: '/contribute', activeMatch: '^/contribute' },
      { text: 'Extensions', link: '/extensions/', activeMatch: '^/extensions/' },
    ],
    sidebar: {
      '/docs/': docsSidebar,
      '/download': docsSidebar,
      '/changelogs': docsSidebar,
      '/contribute': docsSidebar,
      '/extensions/': docsSidebar,
    },
    socialLinks: [{ icon: 'github', link: repo }],
    editLink: {
      pattern: `${repo}/edit/main/apps/docs/:path`,
      text: 'Help us improve this page',
    },
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    footer: {
      message: 'Matane hosts no content: sources come from extensions. Released under the GPL-3.0 license.',
      copyright: 'Copyright © 2026 SukunDev',
    },
  },
});
