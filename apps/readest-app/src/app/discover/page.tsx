'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdRefresh, MdCheck, MdArrowOutward, MdClose, MdUndo } from 'react-icons/md';
import LibrarySubPage, { secondaryButton } from '@/components/library/LibrarySubPage';
import { useDiscoveryDb } from '@/hooks/useDiscoveryDb';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useOpenZLibrary } from '@/hooks/useOpenZLibrary';
import { useWebBrowserDownloads } from '@/hooks/useWebBrowserDownloads';
import { useTranslation } from '@/hooks/useTranslation';
import { isTauriAppPlatform } from '@/services/environment';
import { openWebBrowser } from '@/services/webBrowser/webBrowser';
import { getWebBrowserOptions } from '@/services/webBrowser/webBrowserOptions';
import { navigateToReader } from '@/utils/nav';
import { OnlineQueue } from '@/services/discovery/onlineQueue';
import { doubanSearchUrl, loadBookDetails } from '@/services/discovery/metadata';
import {
  DISCOVERY_CATEGORIES,
  type DiscoveryBook,
  type DiscoveryCategory,
} from '@/services/discovery/types';

function DiscoverContent() {
  const { db, error: storageError, retry } = useDiscoveryDb();
  const [category, setCategory] = useState<DiscoveryCategory>('all');
  const [allLanguages, setAllLanguages] = useState(false);
  const [book, setBook] = useState<DiscoveryBook | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [undo, setUndo] = useState<DiscoveryBook | null>(null);
  const [failedCover, setFailedCover] = useState('');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const transaction = useRef(false);
  const activeRun = useRef<Promise<void>>(Promise.resolve());
  const touch = useRef<{ x: number; y: number } | null>(null);
  const life = useRef<AbortController | null>(null);
  const queue = useMemo(
    () => (db ? new OnlineQueue(db, category, allLanguages) : null),
    [db, category, allLanguages],
  );
  const router = useRouter();
  const _ = useTranslation();
  const openZLibrary = useOpenZLibrary();
  const eink = useSettingsStore((state) => !!state.settings.globalViewSettings?.isEink);
  useWebBrowserDownloads();

  async function nextBook(signal = life.current?.signal) {
    if (!queue || !db) return;
    const result = await queue.next(useLibraryStore.getState().library, signal);
    signal?.throwIfAborted();
    if (!result) throw Error('当前范围暂时没有新的书籍，可以切换方向或开启其他语言');
    setBook(result.book);
    setOffline(result.offline);
    setFailedCover('');
    setExpanded(false);
  }

  async function run(action: () => Promise<void>) {
    if (transaction.current || !db) return;
    transaction.current = true;
    setBusy(true);
    setError('');
    const task = action();
    activeRun.current = task.catch(() => {});
    try {
      await task;
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError'))
        setError(
          err instanceof Error ? err.message : typeof err === 'string' ? err : '操作失败，请重试',
        );
    } finally {
      transaction.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!queue) return;
    const controller = new AbortController();
    life.current = controller;
    void activeRun.current.then(() => {
      if (!controller.signal.aborted) void run(() => nextBook(controller.signal));
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  useEffect(() => {
    if (!book) return;
    const controller = new AbortController();
    // Briefly settle on the card before using a provider request slot for
    // optional details. Rapid swipes leave those slots for new candidates.
    const detailsTimer = setTimeout(() => {
      void loadBookDetails(book, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted)
            setBook((current) => (current?.id === result.id ? result : current));
        })
        .catch(() => {
          /* Optional information never blocks browsing. */
        });
    }, 250);
    void queue?.prefetch(life.current?.signal).catch(() => {});
    return () => {
      clearTimeout(detailsTimer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, queue]);

  async function dismiss() {
    if (!book || !db) return;
    await db.record(book, 'dismissed');
    setUndo(book);
    await nextBook();
  }

  async function reviews() {
    if (!book) return;
    const url = doubanSearchUrl(book);
    if (isTauriAppPlatform()) {
      const result = await openWebBrowser(url, getWebBrowserOptions(_, eink));
      if (result.openBookHash) navigateToReader(router, [result.openBookHash]);
    } else window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <LibrarySubPage title='发现书籍' description='从书架之外，遇见下一本想读的书'>
      <div className='mb-5 flex flex-wrap gap-3'>
        <label className='flex min-w-0 flex-1 items-center gap-3 text-sm'>
          想读的方向
          <select
            aria-label='想读的方向'
            className='select eink-bordered bg-base-100 min-h-11 flex-1 rounded-xl'
            value={category}
            disabled={!db || busy}
            onChange={(event) => {
              setUndo(null);
              setCategory(event.target.value as DiscoveryCategory);
            }}
          >
            {Object.entries(DISCOVERY_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className='flex min-h-11 items-center gap-2 text-sm'>
          <input
            type='checkbox'
            className='checkbox checkbox-sm'
            checked={allLanguages}
            disabled={!db || busy}
            onChange={(event) => {
              setUndo(null);
              setAllLanguages(event.target.checked);
            }}
          />
          包含其他语言
        </label>
      </div>
      {(storageError || error) && (
        <div
          role='alert'
          className='eink-bordered bg-base-100 border-base-300 mb-4 rounded-xl border p-4 text-sm leading-relaxed'
        >
          <p>{storageError || error}</p>
          <button
            type='button'
            className={`${secondaryButton} mt-2`}
            onClick={() => (storageError ? retry() : void run(() => nextBook()))}
          >
            重试
          </button>
        </div>
      )}
      {!db && !storageError && (
        <p role='status' className='text-base-content/65 py-10 text-center'>
          正在读取书架与记录…
        </p>
      )}
      {db && !book && !error && (
        <p role='status' className='text-base-content/65 py-16 text-center'>
          正在寻找下一本书…
        </p>
      )}
      {db && book && (
        <article
          aria-label='书籍推荐卡片'
          className='eink-bordered border-base-300 bg-base-100 touch-pan-y overflow-hidden rounded-2xl border'
          style={!eink ? { transform: `translateX(${swipeOffset}px)` } : undefined}
          onTouchStart={(event) => {
            if (
              busy ||
              event.touches.length !== 1 ||
              (event.target instanceof Element && event.target.closest('button,a,input,select'))
            )
              return;
            touch.current = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
          }}
          onTouchMove={(event) => {
            if (!touch.current) return;
            const point = event.touches[0];
            if (!point || event.touches.length !== 1) {
              touch.current = null;
              setSwipeOffset(0);
              return;
            }
            const dx = point.clientX - touch.current.x,
              dy = point.clientY - touch.current.y;
            if (Math.abs(dy) > Math.abs(dx)) {
              touch.current = null;
              setSwipeOffset(0);
              return;
            }
            if (!eink && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
              setSwipeOffset(Math.max(-120, Math.min(0, dx)));
          }}
          onTouchCancel={() => {
            touch.current = null;
            setSwipeOffset(0);
          }}
          onTouchEnd={(event) => {
            const start = touch.current,
              point = event.changedTouches[0];
            touch.current = null;
            setSwipeOffset(0);
            if (
              start &&
              point &&
              !busy &&
              point.clientX - start.x < -72 &&
              Math.abs(point.clientX - start.x) > Math.abs(point.clientY - start.y) * 1.5
            )
              void run(dismiss);
          }}
        >
          <div className='p-6 sm:p-8'>
            <div className='flex items-start gap-5'>
              {book.metadata?.coverUrl && failedCover !== book.metadata.coverUrl && (
                <img
                  crossOrigin='anonymous'
                  src={book.metadata.coverUrl}
                  alt={`${book.title}封面`}
                  className='h-32 w-20 shrink-0 rounded-md object-contain'
                  onError={() => setFailedCover(book.metadata!.coverUrl!)}
                  onLoad={(event) => {
                    if (event.currentTarget.naturalWidth <= 1)
                      setFailedCover(book.metadata!.coverUrl!);
                  }}
                />
              )}
              <div className='min-w-0 flex-1'>
                <p className='text-base-content/50 mb-3 text-xs'>
                  {DISCOVERY_CATEGORIES[book.category]}
                </p>
                <h2 className='text-base-content break-words text-2xl font-semibold leading-snug tracking-tight sm:text-3xl'>
                  {book.title}
                </h2>
                <p className='text-base-content/65 mt-3 break-words text-sm'>
                  {book.author || '作者未注明'}
                </p>
              </div>
            </div>
            {book.metadata?.rating && (
              <p className='text-base-content/65 mt-5 text-sm'>
                ★ {book.metadata.rating.toFixed(1)} / 5{' '}
                <span className='text-base-content/45'>
                  · Open Library · {book.metadata.ratingCount} 人评分
                </span>
              </p>
            )}
            <div className='border-base-200 mt-6 border-t pt-5'>
              <p
                className={`text-base-content/85 whitespace-pre-line break-words text-base leading-8 ${expanded ? '' : 'line-clamp-8'}`}
              >
                {book.summary || '暂无简介'}
              </p>
              {book.summary.length > 280 && (
                <button
                  type='button'
                  className={`${secondaryButton} mt-2`}
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? '收起简介' : '展开简介'}
                </button>
              )}
            </div>
          </div>
          <div className='border-base-200 border-t p-4 sm:p-6'>
            <button
              type='button'
              className='btn btn-primary min-h-12 h-auto w-full rounded-xl py-3'
              disabled={busy || !db || !isTauriAppPlatform()}
              onClick={() =>
                void run(async () => {
                  await openZLibrary(`${book.title} ${book.author}`.trim());
                  await db!.record(book, 'selected');
                })
              }
            >
              去 Z-Library 找这本书 <MdArrowOutward aria-hidden />
            </button>
            <div className='mt-3 grid grid-cols-2 gap-2'>
              <button
                type='button'
                className={secondaryButton}
                disabled={busy}
                onClick={() => void run(() => nextBook())}
              >
                <MdRefresh aria-hidden />
                {busy ? '正在寻找…' : '换一本'}
              </button>
              <button
                type='button'
                className={secondaryButton}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await db!.record(book, 'read');
                    await nextBook();
                  })
                }
              >
                <MdCheck aria-hidden />
                已经读过
              </button>
            </div>
            <div className='mt-2 flex justify-between gap-2'>
              <button
                type='button'
                className={`${secondaryButton} text-base-content/60 text-sm`}
                disabled={busy}
                onClick={() => void run(dismiss)}
              >
                <MdClose aria-hidden />
                不感兴趣
              </button>
              <button
                type='button'
                className={`${secondaryButton} text-base-content/60 text-sm`}
                disabled={busy}
                onClick={() => void run(reviews)}
              >
                豆瓣书评 <MdArrowOutward aria-hidden />
              </button>
            </div>
          </div>
        </article>
      )}
      {undo && (
        <div role='status' className='mt-4 flex items-center justify-between gap-3 text-sm'>
          <span className='text-base-content/65'>已跳过《{undo.title}》</span>
          <button
            type='button'
            className={secondaryButton}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await db!.remove(undo.id);
                await db!.markSeen(undo);
                setBook(undo);
                setUndo(null);
              })
            }
          >
            <MdUndo aria-hidden />
            撤销
          </button>
        </div>
      )}
      <p className='text-base-content/50 mt-5 text-center text-xs leading-6'>
        {offline
          ? '当前显示离线备用书单，联网后继续获取更多书籍'
          : '左滑表示不感兴趣 · 已读与书架已有书籍会自动排除'}
      </p>
      <p className='text-base-content/45 mt-1 text-center text-xs leading-6'>
        选择版本并下载后，Readest 会自动导入书架
      </p>
    </LibrarySubPage>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}
