<script setup lang="ts">
import { withBase } from 'vitepress';
import { computed, onMounted, ref } from 'vue';

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

const assetFor = (variant: Variant) => release.value?.assets.find((a) => variant.match.test(a.name));

// Only offer what the release has; before it loads, every variant is listed (the button still links to the releases page).
const variants = computed(() => (release.value ? VARIANTS.filter((v) => assetFor(v)) : VARIANTS));
const current = computed(() => VARIANTS.find((v) => v.id === selected.value) ?? VARIANTS[0]);
const asset = computed(() => assetFor(current.value));
const href = computed(() => asset.value?.browser_download_url ?? RELEASES_URL);
const osName = computed(() => GROUPS.find((g) => g.os === current.value.os)?.label ?? '');
const size = computed(() => (asset.value ? `${Math.round(asset.value.size / 1024 / 1024)} MB` : ''));
const meta = computed(() =>
  release.value ? [release.value.tag_name, size.value].filter(Boolean).join(' · ') : 'Latest release',
);

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
  release.value = await loadRelease();
  // A variant the release does not have falls back to the first one it does.
  if (release.value && !assetFor(current.value)) selected.value = variants.value[0]?.id ?? selected.value;
});
</script>

<template>
  <div class="download">
    <p v-if="mobile" class="note">Matane is a desktop app. Open this page on your computer to download it.</p>
    <div class="row">
      <a class="button" :href="href" :download="asset ? '' : undefined" rel="noopener">
        <span class="title">Download for {{ osName }}</span>
        <span class="meta">{{ meta }}</span>
      </a>
      <select v-model="selected" class="select" aria-label="Choose your system">
        <optgroup v-for="group in GROUPS" :key="group.os" :label="group.label">
          <template v-for="v in variants" :key="v.id">
            <option v-if="v.os === group.os" :value="v.id">{{ v.label }}</option>
          </template>
        </optgroup>
      </select>
    </div>
    <p class="more">
      <a href="https://aur.archlinux.org/packages/matane-bin">Arch (AUR)</a> ·
      <a href="https://flathub.org/apps/dev.sukun.matane">Flathub</a> ·
      <a href="https://github.com/mataneorg/matane/releases">All releases</a> ·
      <a :href="withBase('/guide/install')">Install guide</a>
    </p>
  </div>
</template>

<style scoped>
.download {
  margin-top: 24px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.button {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  min-height: 52px;
  padding: 6px 24px;
  border-radius: 8px;
  background-color: var(--vp-c-brand-3);
  color: var(--vp-c-white);
  text-decoration: none;
  transition: background-color 0.25s;
}
.button:hover {
  background-color: var(--vp-c-brand-2);
}
.title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}
.meta {
  font-size: 12px;
  line-height: 1.3;
  opacity: 0.85;
}
.select {
  min-height: 52px;
  max-width: 100%;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 14px;
  cursor: pointer;
}
.select:hover {
  border-color: var(--vp-c-brand-1);
}
.note {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
.more {
  margin-top: 10px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.more a {
  color: var(--vp-c-text-2);
  text-decoration: underline;
}
.more a:hover {
  color: var(--vp-c-brand-1);
}

@media (min-width: 640px) {
  .download {
    margin-top: 32px;
  }
}
</style>
