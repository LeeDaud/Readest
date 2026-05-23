import type { FontFamilyMode } from './types';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

async function getPlatform(): Promise<'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'web'> {
  if (!isTauri()) return 'web';
  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    return platform() as 'macos' | 'windows' | 'linux' | 'ios' | 'android';
  } catch {
    return 'web';
  }
}

let cachedPlatform: string | null = null;
let platformPromise: Promise<string> | null = null;

function detectPlatform(): Promise<string> {
  if (cachedPlatform) return Promise.resolve(cachedPlatform);
  if (platformPromise) return platformPromise;

  platformPromise = getPlatform().then((p) => {
    cachedPlatform = p;
    return p;
  });

  return platformPromise;
}

export async function getPlatformFontStack(family: FontFamilyMode): Promise<string> {
  const platform = await detectPlatform();

  if (family === 'serif') {
    switch (platform) {
      case 'macos':
      case 'ios':
        return '"Songti SC", "STSong", "Noto Serif CJK SC", Georgia, serif';
      case 'windows':
        return '"SimSun", "STSong", "Noto Serif CJK SC", Georgia, serif';
      case 'linux':
      case 'android':
        return '"Noto Serif CJK SC", "LXGW WenKai", Georgia, serif';
      default:
        return '"Noto Serif CJK SC", "Songti SC", "SimSun", Georgia, serif';
    }
  }

  switch (platform) {
    case 'macos':
    case 'ios':
      return '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "LXGW WenKai", system-ui, -apple-system, sans-serif';
    case 'windows':
      return '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "LXGW WenKai", system-ui, sans-serif';
    case 'linux':
    case 'android':
      return '"Noto Sans CJK SC", "WenQuanYi Micro Hei", "LXGW WenKai", "PingFang SC", system-ui, sans-serif';
    default:
      return '"PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", "LXGW WenKai", system-ui, -apple-system, sans-serif';
  }
}
