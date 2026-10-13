import { useState } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { getZLibraryUrls, normalizeZLibraryUrls } from '@/services/zlibrary/sites';
import { BoxedList, Tips } from '../primitives';

export default function ZLibraryForm() {
  const { envConfig } = useEnv();
  const [draft, setDraft] = useState(() => {
    try {
      return getZLibraryUrls(useSettingsStore.getState().settings).join('\n');
    } catch {
      return useSettingsStore.getState().settings.zlibraryUrls?.join('\n') || '';
    }
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const urls = normalizeZLibraryUrls(draft.split('\n'));
      const store = useSettingsStore.getState();
      const next = { ...store.settings, zlibraryUrls: urls };
      await store.saveSettings(envConfig, next);
      // Preserve concurrent in-memory changes to unrelated settings.
      store.setSettings({ ...useSettingsStore.getState().settings, zlibraryUrls: urls });
      setDraft(urls.join('\n'));
      setMessage('已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className='flex w-full flex-col gap-4'>
      <BoxedList title='Z-Library 网站' innerClassName='ps-0!'>
        <div className='flex flex-col gap-3 p-4'>
          <label htmlFor='zlibrary-sites'>网站列表（每行一个，按顺序尝试）</label>
          <textarea
            id='zlibrary-sites'
            className='textarea eink-bordered border-base-300 w-full'
            rows={6}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage('');
              setError('');
            }}
            disabled={saving}
            autoCapitalize='none'
            autoCorrect='off'
            spellCheck={false}
            placeholder='https://zh.zlibrary.by'
          />
          <button
            type='button'
            className='btn btn-contrast self-end'
            disabled={saving}
            onClick={save}
          >
            {saving ? '保存中…' : '保存网站'}
          </button>
          {error && (
            <p role='alert' className='text-error'>
              {error}
            </p>
          )}
          {message && <p role='status'>{message}</p>}
        </div>
      </BoxedList>
      <Tips>
        <li>最多配置 10 个 HTTPS 网址。调整行的顺序即可调整优先级；空行和重复网址会自动忽略。</li>
        <li>
          从书架添加 Z-Library
          书籍时直接访问第一个网站，连接失败会尝试下一个。登录验证页面会保留，下载完成后自动加入书架。
        </li>
      </Tips>
    </div>
  );
}
