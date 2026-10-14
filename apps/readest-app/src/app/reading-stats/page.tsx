'use client';
import { Suspense, useEffect, useState } from 'react';
import { MdSchedule } from 'react-icons/md';
import Link from 'next/link';
import LibrarySubPage, { secondaryButton } from '@/components/library/LibrarySubPage';
import BoxedList from '@/components/settings/primitives/BoxedList';
import { useEnv } from '@/context/EnvContext';
import { useAppLockStore } from '@/store/appLockStore';
import { StatisticsDb, type ReadingSummary } from '@/services/statistics/statisticsDb';

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return hours
    ? `${hours} 小时 ${minutes} 分钟`
    : seconds >= 60
      ? `${minutes} 分钟`
      : `${Math.floor(seconds)} 秒`;
}
function ReadingStatsContent() {
  const { appService } = useEnv();
  const unlocked = useAppLockStore((state) => state.isInitialized && state.isUnlocked);
  const [summary, setSummary] = useState<ReadingSummary | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!appService || !unlocked) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setError('');
    void StatisticsDb.open(appService)
      .then((db) => db.getReadingSummary())
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '无法读取阅读时长');
      });
    return () => {
      cancelled = true;
    };
  }, [appService, unlocked, retry]);
  return (
    <LibrarySubPage title='阅读时长' description='阅读时自动记录，按书籍查看累计时间'>
      {error && (
        <div role='alert' className='eink-bordered bg-base-100 rounded-xl border p-4'>
          <p>{error}</p>
          <button
            type='button'
            className={`${secondaryButton} mt-3`}
            onClick={() => setRetry((value) => value + 1)}
          >
            重试
          </button>
        </div>
      )}
      {!error && !summary && (
        <p role='status' className='text-base-content/65 py-12 text-center'>
          正在读取阅读时长…
        </p>
      )}
      {summary && unlocked && (
        <>
          <section
            aria-label='总阅读时长'
            className='eink-bordered border-base-300 bg-base-100 mb-6 rounded-2xl border p-6 sm:p-8'
          >
            <p className='text-base-content/60 flex items-center gap-2 text-sm'>
              <MdSchedule aria-hidden />
              总阅读时长
            </p>
            <p className='mt-4 text-3xl font-semibold tracking-tight sm:text-4xl'>
              {duration(summary.totalSeconds)}
            </p>
            <p className='text-base-content/50 mt-3 text-sm'>已记录 {summary.books.length} 本书</p>
          </section>
          {summary.books.length ? (
            <BoxedList title='各本书的阅读时长'>
              <ul>
                {summary.books.map((book) => (
                  <li
                    key={book.md5}
                    className='border-base-200 flex flex-wrap items-center justify-between gap-3 border-b py-4 pe-4 last:border-b-0'
                  >
                    <div className='min-w-0 flex-1'>
                      <h2 className='break-words text-base font-medium'>{book.title}</h2>
                      <p className='text-base-content/60 mt-1 break-words text-sm'>
                        {book.authors || '作者未注明'}
                      </p>
                    </div>
                    <p className='text-base-content/80 whitespace-nowrap text-sm tabular-nums'>
                      {duration(book.seconds)}
                    </p>
                  </li>
                ))}
              </ul>
            </BoxedList>
          ) : (
            <div className='py-8 text-center'>
              <p className='text-base-content/65 mb-4'>打开一本书，开始积累阅读时光</p>
              <Link href='/library' className='btn btn-contrast min-h-11 rounded-xl'>
                去书架阅读
              </Link>
            </div>
          )}
          <p className='text-base-content/50 mt-5 text-sm leading-6'>
            时长为自动估算，长时间无操作会暂停计时。已有朗读时间沿用 Readest
            的统计方式；已读清单不会生成阅读时长
          </p>
        </>
      )}
    </LibrarySubPage>
  );
}
export default function ReadingStatsPage() {
  return (
    <Suspense>
      <ReadingStatsContent />
    </Suspense>
  );
}
