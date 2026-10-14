import { useRef, useState } from 'react';
import { MdArrowDownward, MdArrowUpward, MdClose } from 'react-icons/md';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getZLibraryUrls, normalizeZLibraryUrls } from '@/services/zlibrary/sites';
import { BoxedList, Tips } from '../primitives';

type SiteDraft = { id: number; url: string; name: string };

export default function ZLibraryForm() {
  const { envConfig } = useEnv();
  const [sites, setSites] = useState<SiteDraft[]>(() => {
    const { settings } = useSettingsStore.getState();
    let urls: string[];
    try {
      urls = getZLibraryUrls(settings);
    } catch {
      urls = settings.zlibraryUrls || [];
    }
    return urls.map((url, id) => ({ id, url, name: settings.zlibrarySiteNames?.[url] || '' }));
  });
  const nextId = useRef(sites.length);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (rows: SiteDraft[]) => {
    setSites(rows);
    setMessage('');
    setError('');
  };
  const move = (index: number, offset: number) => {
    const rows = [...sites];
    [rows[index], rows[index + offset]] = [rows[index + offset]!, rows[index]!];
    change(rows);
  };
  const save = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const urls = normalizeZLibraryUrls(sites.map((site) => site.url));
      const names: Record<string, string> = {};
      for (const site of sites) {
        if (!site.url.trim()) continue;
        const url = normalizeZLibraryUrls([site.url])[0]!;
        if (!names[url] && site.name.trim()) names[url] = site.name.trim().slice(0, 32);
      }
      const store = useSettingsStore.getState();
      const patch = { zlibraryUrls: urls, zlibrarySiteNames: names };
      await store.saveSettings(envConfig, { ...store.settings, ...patch });
      store.setSettings({ ...useSettingsStore.getState().settings, ...patch });
      setSites(urls.map((url) => ({ id: nextId.current++, url, name: names[url] || '' })));
      setMessage('已保存，下次进入 Z-Library 时生效');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className='flex w-full flex-col gap-4'>
      <BoxedList title='Z-Library 网站' innerClassName='ps-0!'>
        <ol className='divide-base-200 divide-y'>
          {sites.map((site, index) => (
            <li key={site.id} className='flex flex-col gap-3 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-base-content/70 text-sm'>
                  {index === 0 ? '优先入口' : `备用入口 ${index}`}
                </span>
                <div className='flex gap-1'>
                  <button
                    type='button'
                    className='btn btn-ghost btn-square min-h-11 min-w-11'
                    aria-label={`上移网站 ${index + 1}`}
                    disabled={saving || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <MdArrowUpward />
                  </button>
                  <button
                    type='button'
                    className='btn btn-ghost btn-square min-h-11 min-w-11'
                    aria-label={`下移网站 ${index + 1}`}
                    disabled={saving || index === sites.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <MdArrowDownward />
                  </button>
                  <button
                    type='button'
                    className='btn btn-ghost btn-square min-h-11 min-w-11'
                    aria-label={`删除网站 ${index + 1}`}
                    disabled={saving}
                    onClick={() => change(sites.filter((row) => row.id !== site.id))}
                  >
                    <MdClose />
                  </button>
                </div>
              </div>
              <label className='flex flex-col gap-1 text-sm'>
                网站名称（可选）
                <input
                  aria-label={`网站 ${index + 1} 名称`}
                  className='input eink-bordered border-base-300 w-full'
                  value={site.name}
                  disabled={saving}
                  maxLength={32}
                  placeholder='例如：常用入口'
                  onChange={(event) =>
                    change(
                      sites.map((row) =>
                        row.id === site.id ? { ...row, name: event.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
              <label className='flex flex-col gap-1 text-sm'>
                网站地址
                <input
                  aria-label={`网站 ${index + 1} 地址`}
                  className='input eink-bordered border-base-300 w-full'
                  value={site.url}
                  disabled={saving}
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck={false}
                  inputMode='url'
                  placeholder='https://zh.zlibrary.by'
                  onChange={(event) =>
                    change(
                      sites.map((row) =>
                        row.id === site.id ? { ...row, url: event.target.value } : row,
                      ),
                    )
                  }
                />
              </label>
            </li>
          ))}
        </ol>
        <div className='flex flex-wrap justify-between gap-3 p-4'>
          <button
            type='button'
            className='btn btn-ghost eink-bordered'
            disabled={saving || sites.length >= 10}
            onClick={() => change([...sites, { id: nextId.current++, url: '', name: '' }])}
          >
            添加网站
          </button>
          <button type='button' className='btn btn-contrast' disabled={saving} onClick={save}>
            {saving ? '保存中…' : '保存网站'}
          </button>
        </div>
        {error && (
          <p role='alert' className='text-error px-4 pb-4'>
            {error}
          </p>
        )}
        {message && (
          <p role='status' className='px-4 pb-4'>
            {message}
          </p>
        )}
      </BoxedList>
      <Tips>
        <li>第一个网站优先访问，连接失败后依次尝试备用入口。使用上下箭头调整顺序。</li>
        <li>
          最多保存 10 个 HTTPS
          入口，空地址和重复网址会自动忽略。名称仅用于显示，登录验证页面会保留。
        </li>
      </Tips>
    </div>
  );
}
