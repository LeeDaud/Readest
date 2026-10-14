'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { MdAdd, MdEdit, MdDeleteOutline } from 'react-icons/md';
import LibrarySubPage, { secondaryButton } from '@/components/library/LibrarySubPage';
import BoxedList from '@/components/settings/primitives/BoxedList';
import { useDiscoveryDb } from '@/hooks/useDiscoveryDb';
import { useLibraryStore } from '@/store/libraryStore';
import { DISCOVERY_CATALOG } from '@/services/discovery/catalog';
import { matchesWork } from '@/services/discovery/recommendations';
import type { DiscoveryRecord } from '@/services/discovery/types';

function ReadHistoryContent() {
  const { db, error: storageError, retry } = useDiscoveryDb();
  const library = useLibraryStore((state) => state.library);
  const [records, setRecords] = useState<DiscoveryRecord[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<DiscoveryRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [deleted, setDeleted] = useState<DiscoveryRecord | null>(null);
  const generation = useRef(0);
  const writing = useRef(false);
  const titleInput = useRef<HTMLInputElement>(null);

  async function load(append = false) {
    if (!db) return;
    const token = ++generation.current;
    const next = await db.listRead(query, append ? records.length : 0, 50);
    if (generation.current !== token) return;
    setRecords((current) => (append ? [...current, ...next] : next));
    setMore(next.length === 50);
  }
  useEffect(() => {
    void load().catch((err) => setError(String(err)));
    return () => {
      generation.current++;
    };
  }, [db, query]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editing) titleInput.current?.focus();
  }, [editing?.id]);
  async function run(action: () => Promise<void>) {
    if (writing.current || !db) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const add = () =>
    setEditing({
      id: `manual:${crypto.randomUUID()}`,
      title: '',
      author: '',
      status: 'read',
      updatedAt: Date.now(),
    });

  return (
    <LibrarySubPage
      title='已读清单'
      description='记下读过的书，推荐时会自动避开'
      action={
        <button type='button' className={secondaryButton} disabled={!db || busy} onClick={add}>
          <MdAdd aria-hidden />
          添加
        </button>
      }
    >
      {(storageError || error) && (
        <div role='alert' className='eink-bordered bg-base-100 mb-4 rounded-xl border p-4 text-sm'>
          {storageError || error}
          {storageError && (
            <button type='button' className={secondaryButton} onClick={retry}>
              重试
            </button>
          )}
        </div>
      )}
      {editing ? (
        <form
          className='eink-bordered border-base-300 bg-base-100 mb-6 space-y-4 rounded-2xl border p-5'
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const known = DISCOVERY_CATALOG.find((book) =>
                matchesWork(book, editing.title, editing.author),
              );
              await db!.saveRead({
                ...editing,
                titleAliases: editing.titleAliases ?? known?.titleAliases,
                authorAliases: editing.authorAliases ?? known?.authorAliases,
                updatedAt: Date.now(),
              });
              setEditing(null);
              await load();
            });
          }}
        >
          <h2 className='text-lg font-semibold'>书籍信息</h2>
          <label className='grid gap-2 text-sm'>
            从书架选择
            <select
              className='select eink-bordered w-full'
              aria-label='从书架选择'
              value=''
              disabled={busy}
              onChange={(event) => {
                const book = library.find((book) => book.hash === event.target.value);
                if (book) setEditing({ ...editing, title: book.title, author: book.author });
              }}
            >
              <option value=''>也可以手动填写</option>
              {library
                .filter((book) => !book.deletedAt)
                .map((book) => (
                  <option key={book.hash} value={book.hash}>
                    {book.title}
                  </option>
                ))}
            </select>
          </label>
          <label className='grid gap-2 text-sm'>
            书名
            <input
              ref={titleInput}
              className='input eink-bordered w-full'
              required
              maxLength={300}
              value={editing.title}
              disabled={busy}
              onChange={(event) => setEditing({ ...editing, title: event.target.value })}
            />
          </label>
          <label className='grid gap-2 text-sm'>
            作者
            <input
              className='input eink-bordered w-full'
              maxLength={300}
              placeholder='可选'
              value={editing.author}
              disabled={busy}
              onChange={(event) => setEditing({ ...editing, author: event.target.value })}
            />
          </label>
          <label className='grid gap-2 text-sm'>
            读完日期
            <input
              type='date'
              className='input eink-bordered w-full'
              value={editing.readAt ?? ''}
              disabled={busy}
              onChange={(event) =>
                setEditing({ ...editing, readAt: event.target.value || undefined })
              }
            />
          </label>
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              className={secondaryButton}
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              取消
            </button>
            <button type='submit' className='btn btn-contrast min-h-11 rounded-xl' disabled={busy}>
              保存
            </button>
          </div>
        </form>
      ) : null}
      <label className='mb-5 block'>
        <span className='sr-only'>搜索已读书籍</span>
        <input
          type='search'
          className='input eink-bordered bg-base-100 w-full rounded-xl'
          placeholder='搜索书名或作者'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {!db && !storageError && (
        <p role='status' className='text-base-content/65 py-12 text-center'>
          正在读取已读清单…
        </p>
      )}
      {db && !records.length && (
        <div className='py-12 text-center'>
          <p className='text-base-content/65 mb-4'>
            {query ? '没有匹配的已读书籍' : '把读过的第一本书记在这里'}
          </p>
          <button type='button' className='btn btn-contrast min-h-11 rounded-xl' onClick={add}>
            添加已读书籍
          </button>
        </div>
      )}
      {!!records.length && (
        <BoxedList>
          <ul>
            {records.map((record) => (
              <li
                key={record.id}
                className='border-base-200 flex items-center gap-3 border-b py-4 pe-3 last:border-b-0'
              >
                <div className='min-w-0 flex-1'>
                  <h2 className='break-words text-base font-medium'>{record.title}</h2>
                  <p className='text-base-content/60 mt-1 break-words text-sm'>
                    {record.author || '作者未注明'}
                    {record.readAt ? ` · ${record.readAt}` : ''}
                  </p>
                </div>
                <button
                  type='button'
                  className={`${secondaryButton} px-2`}
                  aria-label={`编辑 ${record.title}`}
                  disabled={busy}
                  onClick={() => setEditing(record)}
                >
                  <MdEdit aria-hidden />
                </button>
                <button
                  type='button'
                  className={`${secondaryButton} px-2`}
                  aria-label={`删除 ${record.title}`}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await db!.remove(record.id);
                      setDeleted(record);
                      await load();
                    })
                  }
                >
                  <MdDeleteOutline aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </BoxedList>
      )}
      {more && (
        <button
          type='button'
          className={`${secondaryButton} mt-4 w-full`}
          disabled={busy}
          onClick={() => void run(() => load(true))}
        >
          加载更多
        </button>
      )}
      {deleted && (
        <div role='status' className='mt-4 flex items-center justify-between gap-3 text-sm'>
          <span>已删除《{deleted.title}》</span>
          <button
            type='button'
            className={secondaryButton}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await db!.saveRead(deleted);
                setDeleted(null);
                await load();
              })
            }
          >
            撤销
          </button>
        </div>
      )}
    </LibrarySubPage>
  );
}
export default function ReadHistoryPage() {
  return (
    <Suspense>
      <ReadHistoryContent />
    </Suspense>
  );
}
