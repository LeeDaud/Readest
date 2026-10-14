'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useAppLockStore } from '@/store/appLockStore';
import { useOpenZLibrary } from '@/hooks/useOpenZLibrary';
import { useWebBrowserDownloads } from '@/hooks/useWebBrowserDownloads';
import { useTranslation } from '@/hooks/useTranslation';
import { isTauriAppPlatform } from '@/services/environment';
import { openWebBrowser } from '@/services/webBrowser/webBrowser';
import { getWebBrowserOptions } from '@/services/webBrowser/webBrowserOptions';
import { navigateToReader } from '@/utils/nav';
import { DISCOVERY_CATALOG } from '@/services/discovery/catalog';
import {
  eligibleBooks,
  matchesWork,
  pickRecommendation,
  readDiscoveryPreferences,
  workKey,
} from '@/services/discovery/recommendations';
import { doubanSearchUrl, loadDiscoveryMetadata } from '@/services/discovery/metadata';
import {
  DISCOVERY_CATEGORIES,
  type DiscoveryBook,
  type DiscoveryCategory,
  type DiscoveryMetadata,
  type DiscoveryPreferences,
  type DiscoveryStatus,
} from '@/services/discovery/types';

const buttonClass =
  'min-h-11 rounded-xl border border-base-content/15 px-4 py-2 disabled:opacity-50';

function DiscoverContent() {
  const { appService, envConfig } = useEnv();
  const unlocked = useAppLockStore((state) => state.isInitialized && state.isUnlocked);
  const library = useLibraryStore((state) => state.library);
  const saved = useSettingsStore((state) => state.settings.bookDiscovery);
  const preferences = readDiscoveryPreferences(saved);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [book, setBook] = useState<DiscoveryBook | null>(null);
  const [metadata, setMetadata] = useState<DiscoveryMetadata | null>(null);
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [metadataState, setMetadataState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [showHistory, setShowHistory] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const transaction = useRef(false);
  const currentBook = useRef(book);
  currentBook.current = book;
  const router = useRouter();
  const _ = useTranslation();
  const openZLibrary = useOpenZLibrary();
  useWebBrowserDownloads();

  useEffect(() => {
    if (!appService || !unlocked) return;
    let cancelled = false;
    void (async () => {
      if (!useSettingsStore.getState().settings.globalViewSettings) {
        const settings = await appService.loadSettings();
        if (cancelled) return;
        useSettingsStore.getState().setSettings(settings);
      }
      if (!useLibraryStore.getState().libraryLoaded) {
        const books = await appService.loadLibraryBooks();
        if (cancelled) return;
        if (!useLibraryStore.getState().libraryLoaded) useLibraryStore.getState().setLibrary(books);
      }
      if (!cancelled) setReady(true);
    })().catch(() => {
      if (!cancelled) setError('无法读取本地书架与记录，请返回书架后重试');
    });
    return () => {
      cancelled = true;
    };
  }, [appService, unlocked]);

  async function save(next: DiscoveryPreferences) {
    const store = useSettingsStore.getState();
    const settings = { ...store.settings, bookDiscovery: next };
    await store.saveSettings(envConfig, settings);
    // Preserve unrelated in-memory changes made while the persistence operation was running.
    store.setSettings({ ...useSettingsStore.getState().settings, bookDiscovery: next });
  }

  async function run(action: () => Promise<void>) {
    if (transaction.current) return;
    transaction.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      transaction.current = false;
      setBusy(false);
    }
  }

  async function nextBook(
    next = readDiscoveryPreferences(useSettingsStore.getState().settings.bookDiscovery),
  ) {
    const candidate = pickRecommendation(
      eligibleBooks(DISCOVERY_CATALOG, next, useLibraryStore.getState().library),
    );
    await save(candidate ? { ...next, seen: [...new Set([...next.seen, candidate.id])] } : next);
    setBook(candidate);
    setMetadata(null);
    setMetadataState('idle');
  }

  async function record(status: DiscoveryStatus) {
    if (!book) return;
    const next = readDiscoveryPreferences(useSettingsStore.getState().settings.bookDiscovery);
    next.records[book.id] = {
      id: book.id,
      title: book.title,
      author: book.author,
      status,
      updatedAt: Date.now(),
    };
    if (status === 'selected') {
      // Opening is reversible; only successful launch marks the recommendation as selected.
      await openZLibrary(`${book.title} ${book.author}`);
      await save(next);
    } else await nextBook(next);
  }

  async function openReview(url: string) {
    if (isTauriAppPlatform()) {
      const result = await openWebBrowser(
        url,
        getWebBrowserOptions(_, !!useSettingsStore.getState().settings.globalViewSettings.isEink),
      );
      if (result.openBookHash) navigateToReader(router, [result.openBookHash]);
    } else window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function fetchMetadata() {
    if (!book) return;
    const target = book;
    setMetadataState('loading');
    try {
      const result = await loadDiscoveryMetadata(target);
      if (currentBook.current?.id === target.id) {
        setMetadata(result);
        setMetadataState('done');
      }
    } catch {
      if (currentBook.current?.id === target.id) setMetadataState('error');
    }
  }

  const available = eligibleBooks(DISCOVERY_CATALOG, preferences, library, true).length;
  const remaining = eligibleBooks(DISCOVERY_CATALOG, preferences, library).length;
  const records = Object.values(preferences.records).sort((a, b) => b.updatedAt - a.updatedAt);
  const disabled = !ready || busy;
  return (
    <main className='bg-base-100 text-base-content h-dvh overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]'>
      <div className='mx-auto max-w-xl'>
        <header className='mb-6 flex items-center justify-between gap-3'>
          <Link href='/library' className={`${buttonClass} inline-flex items-center`}>
            ‹ 书架
          </Link>
          <h1 className='text-lg font-semibold'>发现书籍</h1>
          <button
            className={buttonClass}
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
          >
            阅读记录
          </button>
        </header>
        <p className='text-base-content/65 mb-4 text-sm leading-relaxed'>
          从书架之外遇见一本书。已读、不感兴趣与已选择的书会被排除。
        </p>
        <label className='mb-5 flex items-center gap-3 text-sm'>
          想读的方向
          <select
            aria-label='想读的方向'
            className={`${buttonClass} flex-1 bg-base-100`}
            disabled={disabled}
            value={preferences.category}
            onChange={(event) => {
              const category = event.target.value as DiscoveryCategory;
              void run(() =>
                nextBook({
                  ...readDiscoveryPreferences(useSettingsStore.getState().settings.bookDiscovery),
                  category,
                }),
              );
            }}
          >
            {Object.entries(DISCOVERY_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role='alert' className='text-error mb-4 text-sm'>
            {error}
          </p>
        )}
        {!ready ? (
          <p role='status'>正在读取书架与阅读记录…</p>
        ) : book ? (
          <article
            aria-label='书籍推荐卡片'
            className='border-base-content/10 touch-pan-y rounded-2xl border p-5 shadow-sm'
            style={{
              transform: `translateX(${swipeOffset}px)`,
              opacity: 1 - Math.min(Math.abs(swipeOffset) / 400, 0.35),
            }}
            onTouchStart={(event) => {
              if (
                disabled ||
                event.touches.length !== 1 ||
                (event.target instanceof Element && event.target.closest('button,a,input,select'))
              )
                return;
              const point = event.touches[0]!;
              touch.current = { x: point.clientX, y: point.clientY };
            }}
            onTouchMove={(event) => {
              if (!touch.current) return;
              if (event.touches.length !== 1) {
                touch.current = null;
                setSwipeOffset(0);
                return;
              }
              const point = event.touches[0]!;
              const dx = point.clientX - touch.current.x,
                dy = point.clientY - touch.current.y;
              if (Math.abs(dy) > Math.abs(dx)) {
                touch.current = null;
                setSwipeOffset(0);
                return;
              }
              setSwipeOffset(Math.max(-160, Math.min(0, dx)));
            }}
            onTouchCancel={() => {
              touch.current = null;
              setSwipeOffset(0);
            }}
            onTouchEnd={(event) => {
              const start = touch.current;
              touch.current = null;
              setSwipeOffset(0);
              const point = event.changedTouches[0];
              if (!start || !point || disabled) return;
              const dx = point.clientX - start.x,
                dy = point.clientY - start.y;
              if (dx < -72 && Math.abs(dx) > Math.abs(dy) * 1.5)
                void run(() => record('dismissed'));
            }}
          >
            <div className='mb-5 flex items-start gap-4'>
              <div className='bg-base-200 flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-base-content/10 p-2 text-center text-xl leading-relaxed'>
                {metadata?.coverUrl && failedCover !== metadata.coverUrl ? (
                  <img
                    src={metadata.coverUrl}
                    alt={`${book.title}封面`}
                    className='h-full w-full object-contain'
                    onError={() => setFailedCover(metadata.coverUrl!)}
                  />
                ) : (
                  <span aria-hidden='true'>{book.title}</span>
                )}
              </div>
              <div className='min-w-0'>
                <span className='text-base-content/55 text-xs'>
                  {DISCOVERY_CATEGORIES[book.category]} · 精选书单
                </span>
                <h2 className='my-2 text-2xl font-semibold leading-snug'>{book.title}</h2>
                <p className='text-base-content/70 text-sm leading-relaxed'>{book.author}</p>
              </div>
            </div>
            <h3 className='mb-2 text-sm font-semibold'>为什么可以读一读</h3>
            <p className='mb-4 leading-7'>{book.summary}</p>
            <div className='border-base-content/10 mb-5 border-t pt-4 text-sm'>
              {metadata?.rating ? (
                <p className='mb-3'>
                  ★ {metadata.rating.toFixed(1)} / 5{' '}
                  <span className='text-base-content/55'>
                    · Open Library · {metadata.ratingCount} 人评分
                  </span>
                </p>
              ) : metadataState === 'done' ? (
                <p className='text-base-content/55 mb-3'>暂无可匹配的评分</p>
              ) : null}
              {metadataState === 'error' && (
                <p role='status' className='text-base-content/55 mb-3'>
                  在线资料暂不可用，仍可查看简介与原站书评。
                </p>
              )}
              <div className='flex flex-wrap gap-2'>
                <button
                  className={buttonClass}
                  disabled={metadataState === 'loading'}
                  onClick={() => void fetchMetadata()}
                >
                  {metadataState === 'loading' ? '正在获取…' : '获取封面与评分'}
                </button>
                <button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() => void run(() => openReview(doubanSearchUrl(book)))}
                >
                  豆瓣书评 ↗
                </button>
                {metadata && (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => void run(() => openReview(metadata.url))}
                  >
                    Open Library ↗
                  </button>
                )}
              </div>
            </div>
            <button
              className={`${buttonClass} bg-primary text-primary-content mb-3 w-full border-transparent`}
              disabled={disabled || !isTauriAppPlatform()}
              onClick={() => void run(() => record('selected'))}
            >
              去 Z-Library 找这本书
            </button>
            <p className='text-base-content/55 mb-4 text-xs leading-relaxed'>
              {isTauriAppPlatform()
                ? '选择合适版本并下载，Readest 会自动导入书架。'
                : '请在 Readest App 中搜索、下载并自动导入。'}
            </p>
            <div className='grid grid-cols-3 gap-2'>
              <button
                className={`${buttonClass} px-2`}
                disabled={disabled}
                onClick={() => void run(() => nextBook())}
              >
                换一换
              </button>
              <button
                className={`${buttonClass} px-2`}
                disabled={disabled}
                onClick={() => void run(() => record('read'))}
              >
                已经读过
              </button>
              <button
                className={`${buttonClass} px-2`}
                disabled={disabled}
                onClick={() => void run(() => record('dismissed'))}
              >
                不感兴趣
              </button>
            </div>
          </article>
        ) : (
          <div className='border-base-content/10 rounded-2xl border p-6 text-center'>
            <p className='mb-4 leading-relaxed'>
              {preferences.seen.length && !remaining
                ? '这一轮暂时没有新推荐了。'
                : '准备好遇见下一本书了吗？'}
            </p>
            <button
              className={`${buttonClass} bg-primary text-primary-content`}
              disabled={disabled || !available}
              onClick={() =>
                void run(() => nextBook(remaining ? preferences : { ...preferences, seen: [] }))
              }
            >
              {remaining ? (preferences.seen.length ? '继续推荐' : '随机推荐一本') : '开始新一轮'}
            </button>
            {!available && (
              <p className='text-base-content/55 mt-3 text-sm'>
                这个方向的书已在书架或记录中，可以切换方向或恢复记录。
              </p>
            )}
          </div>
        )}
        <p className='text-base-content/45 my-4 text-xs leading-relaxed'>
          左滑卡片表示不感兴趣，并换一本。 首版精选 {DISCOVERY_CATALOG.length}{' '}
          本，简介为编辑导读。在线评分来自 Open Library；豆瓣书评在原站查看。
        </p>
        {showHistory && (
          <section className='border-base-content/10 mt-6 rounded-2xl border p-4'>
            <h2 className='mb-3 font-semibold'>阅读与推荐记录</h2>
            <form
              className='mb-5 grid gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const cleanTitle = title.trim(),
                    cleanAuthor = author.trim();
                  if (!cleanTitle || !cleanAuthor) throw new Error('请填写书名和作者');
                  const known = DISCOVERY_CATALOG.find((entry) =>
                    matchesWork(entry, cleanTitle, cleanAuthor),
                  );
                  const id = known?.id ?? `manual:${workKey(cleanTitle, cleanAuthor)}`;
                  const next = readDiscoveryPreferences(
                    useSettingsStore.getState().settings.bookDiscovery,
                  );
                  next.records[id] = {
                    id,
                    title: cleanTitle,
                    author: cleanAuthor,
                    status: 'read',
                    updatedAt: Date.now(),
                  };
                  if (book && matchesWork(book, cleanTitle, cleanAuthor)) await nextBook(next);
                  else await save(next);
                  setTitle('');
                  setAuthor('');
                });
              }}
            >
              <label className='grid gap-1 text-sm'>
                书名
                <input
                  maxLength={160}
                  required
                  className={`${buttonClass} bg-base-100`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className='grid gap-1 text-sm'>
                作者
                <input
                  maxLength={160}
                  required
                  className={`${buttonClass} bg-base-100`}
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                />
              </label>
              <button className={buttonClass} disabled={disabled}>
                补记已读书籍
              </button>
            </form>
            {!records.length && (
              <p className='text-base-content/55 text-sm'>暂无记录。书架中的书也会自动排除。</p>
            )}
            <ul className='space-y-4'>
              {records.map((entry) => (
                <li key={entry.id} className='border-base-content/10 border-t pt-3'>
                  <p className='font-medium'>{entry.title}</p>
                  <p className='text-base-content/60 my-1 text-sm'>
                    {entry.author} ·{' '}
                    {{ read: '已读', dismissed: '不感兴趣', selected: '已选择' }[entry.status]}
                  </p>
                  <div className='flex gap-2'>
                    {entry.status === 'selected' && (
                      <button
                        className={buttonClass}
                        disabled={disabled}
                        onClick={() =>
                          void run(async () => {
                            const next = readDiscoveryPreferences(
                              useSettingsStore.getState().settings.bookDiscovery,
                            );
                            next.records[entry.id] = {
                              ...entry,
                              status: 'read',
                              updatedAt: Date.now(),
                            };
                            await save(next);
                          })
                        }
                      >
                        标记已读
                      </button>
                    )}
                    <button
                      className={buttonClass}
                      disabled={disabled}
                      onClick={() =>
                        void run(async () => {
                          const next = readDiscoveryPreferences(
                            useSettingsStore.getState().settings.bookDiscovery,
                          );
                          delete next.records[entry.id];
                          next.seen = next.seen.filter((id) => id !== entry.id);
                          await save(next);
                        })
                      }
                    >
                      恢复推荐
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}
