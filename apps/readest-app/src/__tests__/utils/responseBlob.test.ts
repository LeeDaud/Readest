import { expect, test } from 'vitest';

test('a Response blob retains its bytes when wrapped in a File', async () => {
  const blob = await new Response('book bytes').blob();
  const file = new File([blob], 'book.txt');
  expect(await file.text()).toBe('book bytes');
  expect(file.size).toBe(10);
});
