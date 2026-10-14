'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import SubPageHeader from '@/components/settings/SubPageHeader';
import { useThemeStore } from '@/store/themeStore';

export const secondaryButton =
  'btn btn-ghost eink-bordered min-h-11 h-auto rounded-xl px-4 py-2 font-medium disabled:opacity-50';

export default function LibrarySubPage({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const router = useRouter();
  const insets = useThemeStore((state) => state.safeAreaInsets);
  return (
    <main
      aria-label={title}
      className='bg-base-200 text-base-content h-dvh overflow-y-auto overscroll-contain'
      style={{
        paddingTop: `max(20px, ${insets?.top ?? 0}px, env(safe-area-inset-top))`,
        paddingBottom: `max(24px, ${insets?.bottom ?? 0}px, env(safe-area-inset-bottom))`,
        paddingInlineStart: `max(0px, ${insets?.left ?? 0}px)`,
        paddingInlineEnd: `max(0px, ${insets?.right ?? 0}px)`,
      }}
    >
      <div className='mx-auto w-full max-w-2xl py-2'>
        <SubPageHeader
          parentLabel='书架'
          currentLabel={title}
          description={description}
          onBack={() => router.push('/library')}
          rightSlot={action}
        />
        <div className='px-4'>{children}</div>
      </div>
    </main>
  );
}
