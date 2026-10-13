import type { SystemSettings } from '@/types/settings';

export const DEFAULT_ZLIBRARY_URL = 'https://zh.zlibrary.by/';
export const LEGACY_ZLIBRARY_URL_KEY = 'zreader-zlibrary-url';

export function normalizeZLibraryUrls(entries: string[]): string[] {
  const urls: string[] = [];
  for (const entry of entries) {
    const text = entry.trim();
    if (!text) continue;
    let url: URL;
    try {
      url = new URL(text.includes('://') ? text : `https://${text}`);
    } catch {
      throw new Error(`网址格式不正确：${text}`);
    }
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
      throw new Error('请使用 HTTPS 网址，不要在网址中填写账号或密码');
    }
    url.hash = '';
    if (!urls.includes(url.href)) urls.push(url.href);
  }
  if (!urls.length) throw new Error('请至少配置一个 Z-Library 网址');
  if (urls.length > 10) throw new Error('最多配置 10 个 Z-Library 网址');
  return urls;
}

export function getZLibraryUrls(settings: Pick<SystemSettings, 'zlibraryUrls'>): string[] {
  if (settings.zlibraryUrls !== undefined) return normalizeZLibraryUrls(settings.zlibraryUrls);
  try {
    const legacy = localStorage.getItem(LEGACY_ZLIBRARY_URL_KEY);
    if (legacy) return normalizeZLibraryUrls([legacy]);
  } catch {
    // A missing storage API or invalid legacy entry falls back to the default.
  }
  return [DEFAULT_ZLIBRARY_URL];
}
