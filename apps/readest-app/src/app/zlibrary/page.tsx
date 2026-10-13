'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoke } from '@tauri-apps/api/core';
import { useEnv } from '@/context/EnvContext';
import { isTauriAppPlatform } from '@/services/environment';
import { useZLibraryStore, type DownloadStatus } from '@/store/zlibraryStore';
import { useWebBrowserDownloads } from '@/hooks/useWebBrowserDownloads';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { openWebBrowser } from '@/services/webBrowser/webBrowser';
import { getWebBrowserOptions } from '@/services/webBrowser/webBrowserOptions';
import { navigateToReader } from '@/utils/nav';

const DEFAULT_URL = 'https://zh.zlibrary.by';
const STORAGE_KEY = 'zreader-zlibrary-url';
const statusLabels: Record<DownloadStatus, string> = {
  downloading: '下载中',
  ready: '等待入库',
  importing: '正在添加至书架',
  done: '已加入书架',
  failed: '处理失败',
  unsupported: '暂不支持此文件格式',
};

function ZLibraryContent() {
  const { appService } = useEnv();
  const router = useRouter();
  const _ = useTranslation();
  useWebBrowserDownloads();
  const { downloads, error, setError, retryImports } = useZLibraryStore();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [opening, setOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [openedUrl, setOpenedUrl] = useState('');
  const supported = isTauriAppPlatform() && !!appService;
  const isMobile = !!appService?.isMobileApp;

  useEffect(() => {
    try {
      setUrl(localStorage.getItem(STORAGE_KEY) || DEFAULT_URL);
    } catch {
      /* Use default. */
    }
  }, []);

  const openBrowser = async () => {
    setOpening(true);
    setError('');
    try {
      const target = new URL(url.trim().includes('://') ? url.trim() : `https://${url.trim()}`);
      if (target.protocol !== 'https:' || target.username || target.password) {
        throw new Error('请输入 HTTPS 网址，不要在网址中填写账号或密码');
      }
      setUrl(target.href);
      try {
        localStorage.setItem(STORAGE_KEY, target.href);
      } catch {
        /* Browsing still works. */
      }
      if (isMobile) {
        const result = await openWebBrowser(
          target.href,
          getWebBrowserOptions(_, !!useSettingsStore.getState().settings.globalViewSettings.isEink),
        );
        if (result.openBookHash) navigateToReader(router, [result.openBookHash]);
      } else {
        await invoke('open_zlibrary', { url: target.href, navigate: openedUrl !== target.href });
        setOpened(true);
        setOpenedUrl(target.href);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpening(false);
    }
  };

  return (
    <main
      className='mx-auto min-h-screen max-w-3xl px-6 py-10 text-[var(--wr-text-primary)]'
      style={
        isMobile
          ? {
              paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            }
          : undefined
      }
    >
      <Link href='/library' className='text-sm text-[var(--wr-text-secondary)]'>
        ← 返回书架
      </Link>
      <h1 className='mt-8 text-3xl font-semibold'>Z-Library</h1>
      <p className='mt-3 leading-7 text-[var(--wr-text-secondary)]'>
        在应用内登录、搜索和浏览书籍。点击网站的下载按钮，下载完成后将自动添加至书架。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void openBrowser();
        }}
        className='mt-8 flex flex-col gap-3 sm:flex-row'
      >
        <label className='flex-1'>
          <span className='mb-2 block text-sm'>网站入口</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            autoComplete='url'
            spellCheck={false}
            className='w-full rounded-xl border border-black/10 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#07C160]'
            aria-label='Z-Library 网站入口'
          />
        </label>
        <button
          type='submit'
          disabled={!supported || opening}
          className='rounded-xl bg-[#07C160] px-6 py-3 font-medium text-white disabled:opacity-50 sm:self-end'
        >
          {opening
            ? '正在浏览…'
            : isMobile
              ? '进入 Z-Library'
              : opened
                ? '返回浏览窗口'
                : '打开 Z-Library'}
        </button>
      </form>
      {!supported && (
        <p className='mt-4 text-sm'>
          请使用 Android、iOS 或桌面 App 访问内置书源；网页版暂不支持自动下载入库。
        </p>
      )}
      <p className='mt-4 text-sm leading-6 text-[var(--wr-text-secondary)]'>
        {isMobile
          ? '网站直接显示在 App 内，可登录、返回和刷新。下载状态与入库结果会显示在浏览页面底部，点击“打开”即可阅读。'
          : '登录在独立的应用浏览窗口中完成。支持 EPUB、MOBI、AZW/AZW3、FB2、CBZ、PDF 和 TXT，下载后自动入库。'}
      </p>
      {error && (
        <p role='alert' className='mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </p>
      )}
      {!isMobile && (
        <section className='mt-10' aria-label='下载与入库记录'>
          <div className='flex items-center justify-between'>
            <h2 className='text-lg font-medium'>下载与入库</h2>
            {supported && (
              <button type='button' onClick={retryImports} className='text-sm text-[#05944A]'>
                检查下载 / 重试入库
              </button>
            )}
          </div>
          <div aria-live='polite' className='mt-4 space-y-3'>
            {downloads.length === 0 && (
              <p className='rounded-xl border border-black/5 p-6 text-sm text-[var(--wr-text-secondary)]'>
                还没有下载记录。打开网站，选择一本书并下载即可。
              </p>
            )}
            {downloads.map((item) => (
              <div key={item.id} className='rounded-xl border border-black/10 p-4'>
                <p className='break-words font-medium'>{item.filename}</p>
                <p className='mt-1 text-sm text-[var(--wr-text-secondary)]'>
                  {statusLabels[item.status]}
                </p>
                {item.detail && (
                  <p className='mt-2 break-words text-sm text-red-700'>{item.detail}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default function ZLibraryPage() {
  return (
    <Suspense fallback={<p className='p-6'>正在加载书源…</p>}>
      <ZLibraryContent />
    </Suspense>
  );
}
