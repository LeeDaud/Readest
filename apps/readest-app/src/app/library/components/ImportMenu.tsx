import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useOpenZLibrary } from '@/hooks/useOpenZLibrary';
import { eventDispatcher } from '@/utils/event';
import { MdLanguage, MdMenuBook, MdRssFeed } from 'react-icons/md';
import { LuLibrary } from 'react-icons/lu';
import { IoFileTray } from 'react-icons/io5';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import MenuItem from '@/components/MenuItem';
import Menu from '@/components/Menu';

export interface ImportMenuProps {
  menuClassName?: string;
  setIsDropdownOpen?: (open: boolean) => void;
  onImportBooksFromFiles: () => void;
  onImportBooksFromDirectory?: () => void;
  onImportFromWebBrowser?: () => void;
  onImportBookFromNovelUrl?: () => void;
  onOpenCatalogManager: () => void;
  onOpenFeeds: () => void;
}

const ImportMenu: React.FC<ImportMenuProps> = ({
  menuClassName,
  setIsDropdownOpen,
  onImportBooksFromFiles,
  onImportBooksFromDirectory,
  onImportFromWebBrowser,
  onImportBookFromNovelUrl,
  onOpenCatalogManager,
  onOpenFeeds,
}) => {
  const _ = useTranslation();
  const router = useRouter();
  const openZLibrary = useOpenZLibrary();
  const { appService } = useEnv();

  const handleImportFromFiles = () => {
    onImportBooksFromFiles();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromDirectory = () => {
    onImportBooksFromDirectory?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromWebBrowser = () => {
    onImportFromWebBrowser?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromNovelUrl = () => {
    onImportBookFromNovelUrl?.();
    setIsDropdownOpen?.(false);
  };

  const handleOpenCatalogManager = () => {
    onOpenCatalogManager();
    setIsDropdownOpen?.(false);
  };

  const handleOpenFeeds = () => {
    onOpenFeeds();
    setIsDropdownOpen?.(false);
  };

  return (
    <Menu
      className={clsx(
        'dropdown-content bg-base-100 rounded-box relative! z-[1] mt-3 p-2 shadow-sm',
        menuClassName,
      )}
      onCancel={() => setIsDropdownOpen?.(false)}
    >
      <MenuItem
        label='发现书籍'
        Icon={<MdMenuBook className='h-5 w-5' />}
        onClick={() => {
          setIsDropdownOpen?.(false);
          router.push('/discover');
        }}
      />
      <MenuItem
        label='Z-Library'
        Icon={<MdLanguage className='h-5 w-5' />}
        onClick={() => {
          setIsDropdownOpen?.(false);
          void openZLibrary().catch((err) => {
            eventDispatcher.dispatch('toast', {
              type: 'error',
              message: err instanceof Error ? err.message : String(err),
              timeout: 5000,
            });
          });
        }}
      />
      <MenuItem
        label={_('From Local File')}
        Icon={<IoFileTray className='h-5 w-5' />}
        onClick={handleImportFromFiles}
      />
      {onImportBooksFromDirectory && (
        <MenuItem
          label={_('From Directory')}
          Icon={<IoFileTray className='h-5 w-5' />}
          onClick={handleImportFromDirectory}
        />
      )}
      <hr aria-hidden='true' className='border-base-200 my-1' />
      {onImportFromWebBrowser && (
        <MenuItem
          label={_('From Web Browser')}
          Icon={<MdLanguage className='h-5 w-5' />}
          onClick={handleImportFromWebBrowser}
        />
      )}
      {onImportBookFromNovelUrl && (
        <MenuItem
          label={_('From Web Novel')}
          Icon={<MdMenuBook className='h-5 w-5' />}
          onClick={handleImportFromNovelUrl}
        />
      )}
      <MenuItem
        label={_('From Feed URL')}
        Icon={<MdRssFeed className='h-5 w-5' />}
        onClick={handleOpenFeeds}
      />
      <MenuItem
        label={appService?.isOnlineCatalogsAccessible ? _('Online Library') : _('OPDS Catalogs')}
        Icon={<LuLibrary className='h-5 w-5' />}
        onClick={handleOpenCatalogManager}
      />
    </Menu>
  );
};

export default ImportMenu;
