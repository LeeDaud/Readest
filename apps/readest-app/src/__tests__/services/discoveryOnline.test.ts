import { expect, it, vi } from 'vitest';
vi.mock('@/services/environment', () => ({ isTauriAppPlatform: () => false }));
import { parseCandidates, parseDescription } from '@/services/discovery/openLibrary';

it('uses work identity, safely maps optional metadata and rejects malformed candidates', () => {
  const books = parseCandidates(
    {
      docs: [
        {
          key: '/works/OL123W',
          title: '书名',
          author_name: ['作者'],
          cover_i: 321,
          ratings_average: 4.2,
          ratings_count: 9,
        },
        { key: 'OL124W', title: '无资料', author_name: [] },
        { key: '//evil.example', title: '坏数据' },
      ],
    },
    'literature',
  );
  expect(books).toHaveLength(2);
  expect(books[0]).toMatchObject({
    id: 'OL123W',
    workId: 'OL123W',
    metadata: { rating: 4.2, ratingCount: 9 },
  });
  expect(books[0]!.metadata!.coverUrl).toContain('?default=false');
  expect(books[1]!.metadata!.rating).toBeUndefined();
});

it('accepts work descriptions in both formats without inventing missing summaries', () => {
  expect(parseDescription({ description: { value: '一本书的简介' } })).toBe('一本书的简介');
  expect(parseDescription({ description: '简介' })).toBe('简介');
  expect(parseDescription({ description: { bad: '简介' } })).toBe('');
});
