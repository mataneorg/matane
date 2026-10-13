<script setup lang="ts">
import { withBase } from 'vitepress';
import { computed, onMounted, ref } from 'vue';

// The install page already is the install guide, so it drops that link.
const { guide = true } = defineProps<{ guide?: boolean }>();

// Downloads the newest stable release (GitHub's /releases/latest skips drafts and pre-releases) and picks the file for
// the visitor's system. Asset names come from `artifactName` in apps/desktop/electron-builder.yml. Until the release
// loads, or when it cannot (offline, rate limit), the button links to the releases page.
const REPO = 'mataneorg/matane';
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_KEY = 'matane-latest-release';

interface Asset {
  name: string;
  size: number;
  browser_download_url: string;
}
interface Release {
  tag_name: string;
  assets: Asset[];
}

interface Variant {
  id: string;
  os: 'windows' | 'macos' | 'linux';
  label: string;
  match: RegExp;
}

const VARIANTS: Variant[] = [
  { id: 'win-installer', os: 'windows', label: 'Windows (installer)', match: /-win-x64\.exe$/ },
  { id: 'win-portable', os: 'windows', label: 'Windows (portable)', match: /-win-x64-portable\.exe$/ },
  { id: 'mac-arm64', os: 'macos', label: 'macOS (Apple silicon)', match: /-mac-arm64\.dmg$/ },
  { id: 'mac-x64', os: 'macos', label: 'macOS (Intel)', match: /-mac-x64\.dmg$/ },
  { id: 'linux-appimage', os: 'linux', label: 'Linux (AppImage)', match: /\.AppImage$/ },
  { id: 'linux-deb', os: 'linux', label: 'Linux (.deb: Debian, Ubuntu)', match: /\.deb$/ },
  { id: 'linux-rpm', os: 'linux', label: 'Linux (.rpm: Fedora, openSUSE)', match: /\.rpm$/ },
  { id: 'linux-tar', os: 'linux', label: 'Linux (.tar.gz)', match: /\.tar\.gz$/ },
];
const GROUPS = [
  { os: 'windows', label: 'Windows' },
  { os: 'macos', label: 'macOS' },
  { os: 'linux', label: 'Linux' },
] as const;

const release = ref<Release | null>(null);
const selected = ref('win-installer');
const mobile = ref(false);
// The system is only known in the browser, so the server-rendered button names no OS (and hydration matches).
const ready = ref(false);
const failed = ref(false);

const assetFor = (variant: Variant) => release.value?.assets.find((a) => variant.match.test(a.name));

// Only offer what the release has; before it loads, every variant is listed (the button still links to the releases page).
const variants = computed(() => (release.value ? VARIANTS.filter((v) => assetFor(v)) : VARIANTS));
const current = computed(() => VARIANTS.find((v) => v.id === selected.value) ?? VARIANTS[0]);
const asset = computed(() => assetFor(current.value));
const href = computed(() => asset.value?.browser_download_url ?? RELEASES_URL);
const osName = computed(() => GROUPS.find((g) => g.os === current.value.os)?.label ?? '');
const size = computed(() => (asset.value ? `${Math.round(asset.value.size / 1024 / 1024)} MB` : ''));
const title = computed(() => (ready.value ? `Download for ${osName.value}` : 'Download Matane'));
const meta = computed(() => {
  if (release.value) return [release.value.tag_name, size.value].filter(Boolean).join(' · ');
  return failed.value ? 'Opens GitHub releases' : 'Latest release';
});

async function loadRelease(): Promise<Release | null> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as Release;
  } catch {
    // Storage can be blocked; fetch instead.
  }
  try {
    const res = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Release;
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ tag_name: data.tag_name, assets: data.assets }));
    } catch {
      // Not cached; the next page asks again.
    }
    return data;
  } catch {
    return null;
  }
}

// The browser cannot tell the Linux distribution, so Linux gets the AppImage that runs everywhere. macOS reports
// "Intel" in the user agent on every Mac, so Apple silicon is the default unless the browser says otherwise.
async function detect(): Promise<string> {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }> };
  };
  const ua = navigator.userAgent;
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? '';
  if (/android|iphone|ipad|ipod/i.test(ua)) {
    mobile.value = true;
    return 'win-installer';
  }
  if (/win/i.test(platform) || /windows/i.test(ua)) return 'win-installer';
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) {
    try {
      const hints = await nav.userAgentData?.getHighEntropyValues?.(['architecture']);
      if (hints?.architecture === 'x86') return 'mac-x64';
    } catch {
      // Keep the default.
    }
    return 'mac-arm64';
  }
  if (/linux|x11|cros/i.test(platform) || /linux|x11/i.test(ua)) return 'linux-appimage';
  return 'win-installer';
}

onMounted(async () => {
  selected.value = await detect();
  ready.value = true;
  release.value = await loadRelease();
  failed.value = !release.value;
  // A variant the release does not have falls back to the first one it does.
  if (release.value && !assetFor(current.value)) selected.value = variants.value[0]?.id ?? selected.value;
});
</script>

<template>
  <div class="download" :class="{ page: !guide }">
    <p v-if="mobile" class="note">Matane is a desktop app. Open this page on your computer to download it.</p>
    <div class="split">
      <a class="main" :href="href" :download="asset ? '' : undefined" rel="noopener">
        <span class="title">{{ title }}</span>
        <span class="meta">{{ meta }}</span>
      </a>
      <div class="chev" title="Choose another download">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        <select v-model="selected" aria-label="Choose another download" title="Choose another download">
          <optgroup v-for="group in GROUPS" :key="group.os" :label="group.label">
            <template v-for="v in variants" :key="v.id">
              <option v-if="v.os === group.os" :value="v.id">{{ v.label }}</option>
            </template>
          </optgroup>
        </select>
      </div>
    </div>
    <p class="more">
      <a href="https://aur.archlinux.org/packages/matane-bin">Arch (AUR)</a>
      <a href="https://flathub.org/apps/dev.sukun.matane">Flathub</a>
      <a href="https://github.com/mataneorg/matane/releases">All releases</a>
      <a v-if="guide" :href="withBase('/docs/guides/install')">Install guide</a>
    </p>
  </div>
</template>

<style scoped>
.download {
  margin: 20px 0 0;
  text-align: inherit;
}
.download.page {
  margin: 20px 0 28px;
}
.split {
  display: inline-flex;
  height: 48px;
}
.main,
.chev {
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  transition: background-color 0.2s;
}
.main:hover,
.chev:hover {
  background-color: color-mix(in srgb, #000 14%, var(--vp-c-brand-3));
}
.main:active,
.chev:active {
  background-color: color-mix(in srgb, #000 24%, var(--vp-c-brand-3));
}
.main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20px 0 24px;
  border-radius: 24px 0 0 24px;
  text-align: left;
  text-decoration: none;
}
.main:focus-visible,
.chev:has(select:focus-visible) {
  outline: 2px solid var(--vp-c-text-1);
  outline-offset: 2px;
}
.title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}
.meta {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}
.chev {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  border-radius: 0 24px 24px 0;
  cursor: pointer;
}
.chev::before {
  content: '';
  position: absolute;
  inset: 10px auto 10px 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}
.chev select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  appearance: none;
  /* 16px stops iOS from zooming in on focus. */
  font-size: 16px;
  color-scheme: inherit;
}
.chev select:focus-visible {
  outline: none;
}
.chev select :is(option, optgroup) {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.note {
  max-width: 360px;
  margin: 0 auto 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.5;
}
.page .note {
  margin: 0 0 12px;
}
.more {
  display: block;
  /* The links' side margin is pulled back so the first one lines up with the button edge. */
  margin: 6px -8px 0;
  text-align: inherit;
}
.more a {
  display: inline-block;
  margin: 0 8px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 2;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 3px;
}
.more a:hover {
  color: var(--vp-c-brand-1);
  text-decoration-color: currentColor;
}

@media (min-width: 960px) {
  .note {
    margin-left: 0;
  }
}
@media (max-width: 479px) {
  .split {
    display: flex;
    width: 100%;
  }
  .main {
    flex: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .main,
  .chev {
    transition: none;
  }
}
</style>
