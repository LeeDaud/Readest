import { beforeEach, expect, it } from 'vitest';
import { getZLibraryUrls, normalizeZLibraryUrls } from '@/services/zlibrary/sites';

beforeEach(() => localStorage.clear());
it('normalizes HTTPS entries, removes blanks and duplicates, and retains order', () => {
  expect(
    normalizeZLibraryUrls([
      ' first.example ',
      '',
      'https://second.example/path',
      'https://first.example/#fragment',
    ]),
  ).toEqual(['https://first.example/', 'https://second.example/path']);
});
it.each([
  'http://unsafe.example',
  'https://user:secret@example.com',
  'javascript:alert(1)',
  'https://',
])('rejects unsafe or invalid entry %s', (entry) => {
  expect(() => normalizeZLibraryUrls([entry])).toThrow();
});
it('rejects an empty list and more than ten unique entries', () => {
  expect(() => normalizeZLibraryUrls([' '])).toThrow('至少');
  expect(() =>
    normalizeZLibraryUrls(Array.from({ length: 11 }, (_, i) => `https://site${i}.example`)),
  ).toThrow('10');
});
it('prefers saved settings over the legacy entry', () => {
  localStorage.setItem('zreader-zlibrary-url', 'https://old.example');
  expect(
    getZLibraryUrls({ zlibraryUrls: ['https://new.example', 'https://backup.example'] }),
  ).toEqual(['https://new.example/', 'https://backup.example/']);
});
it('migrates a valid legacy entry and ignores invalid legacy entries', () => {
  localStorage.setItem('zreader-zlibrary-url', 'https://old.example');
  expect(getZLibraryUrls({})).toEqual(['https://old.example/']);
  localStorage.setItem('zreader-zlibrary-url', 'http://unsafe.example');
  expect(getZLibraryUrls({})).toEqual(['https://zh.zlibrary.by/']);
});
