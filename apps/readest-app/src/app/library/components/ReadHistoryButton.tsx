import Link from 'next/link';
import { MdChecklist } from 'react-icons/md';

export default function ReadHistoryButton() {
  return (
    <Link
      href='/read-history'
      className='eink-bordered group border-base-200 bg-base-100 hover:border-base-300 hover:bg-base-300/40 text-base-content focus-visible:ring-base-content/15 flex h-12 min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2'
    >
      <span
        aria-hidden
        className='eink-inverted bg-base-200 text-base-content/60 group-hover:bg-base-content group-hover:text-base-100 flex size-5 shrink-0 items-center justify-center rounded-full'
      >
        <MdChecklist className='size-3.5' />
      </span>
      <span>已读清单</span>
    </Link>
  );
}
