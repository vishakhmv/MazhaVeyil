import React, { useState } from 'react';
import { Home, MapPin, Gauge, ScanLine, Clock, CloudSun, Users, Layers, Menu, X, Languages } from 'lucide-react';
import { useApp } from '../state.jsx';
import { useLang } from '../i18n/index.jsx';
import { cx } from './ui.jsx';

export const Logo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="MazhaVeyil">
    <rect width="48" height="48" rx="13" fill="#12213d" />
    <circle cx="30" cy="17" r="8" fill="#f7b32b" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a} x1="30" y1="17" x2="30" y2="5.5" stroke="#f7b32b" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${a} 30 17)`} />
    ))}
    <circle cx="30" cy="17" r="8" fill="#f7b32b" />
    <path d="M17 22 C17 22 9.5 31 9.5 36 a7.5 7.5 0 0 0 15 0 C24.5 31 17 22 17 22Z" fill="#3fa1db" stroke="#12213d" strokeWidth="2" />
    <path d="M13.2 36.2 a3.8 3.8 0 0 0 3 3.6" stroke="#d1ecfa" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </svg>
);

const ITEMS = [
  { id: 'home', key: 'nav.home', icon: Home },
  { id: 'find', key: 'nav.find', icon: MapPin },
  { id: 'cliff', key: 'nav.cliff', icon: Gauge },
  { id: 'scan', key: 'nav.scan', icon: ScanLine },
  { id: 'veyil', key: 'nav.veyil', icon: Clock },
  { id: 'today', key: 'nav.today', icon: CloudSun },
  { id: 'koottam', key: 'nav.koottam', icon: Users },
  { id: 'atlas', key: 'nav.atlas', icon: Layers },
];

export const Navbar = () => {
  const { page, status } = useApp();
  const { t, lang, toggle } = useLang();
  const [open, setOpen] = useState(false);

  const dot = status.online === null ? 'bg-slate-400' : status.online ? 'bg-leaf-400' : 'bg-cliff-500';
  const dotText = status.online === null ? t('status.checking') : status.online ? (status.offline ? t('status.offline_mode') : t('status.online')) : t('status.down');

  return (
    <header className="sticky top-0 z-[1000] bg-navy-950/95 backdrop-blur text-white border-b border-white/10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <a href="#/home" className="flex items-center gap-3 shrink-0 group" aria-label="MazhaVeyil home">
          <Logo />
          <span className="leading-tight">
            <span className="block font-extrabold text-lg tracking-tight group-hover:text-sun-300 transition-colors">MazhaVeyil</span>
            <span className="block text-[11px] text-navy-300 font-semibold">{t('brand.malayalam')}</span>
          </span>
        </a>

        <nav className="hidden xl:flex items-center gap-0.5" aria-label="Main">
          {ITEMS.map(({ id, key, icon: Icon }) => (
            <a
              key={id}
              href={'#/' + id}
              aria-current={page === id ? 'page' : undefined}
              className={cx('px-2.5 2xl:px-3 py-2 rounded-lg text-[13px] font-bold flex items-center gap-1.5 transition whitespace-nowrap', page === id ? 'bg-white text-navy-900' : 'text-navy-200 hover:text-white hover:bg-white/10')}
            >
              <Icon className="w-4 h-4 hidden 2xl:block" aria-hidden />
              {t(key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-navy-200 px-2" title={dotText} aria-label={dotText}>
            <span className={cx('w-2.5 h-2.5 rounded-full', dot, status.online === false && 'mv-pulse')} />
            <span className="hidden 2xl:inline">{dotText}</span>
          </span>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold min-h-[40px]"
            aria-label={lang === 'en' ? 'Switch to Malayalam' : 'Switch to English'}
          >
            <Languages className="w-4 h-4" aria-hidden />
            {lang === 'en' ? 'മലയാളം' : 'English'}
          </button>
          <button type="button" className="xl:hidden p-2 rounded-lg hover:bg-white/10 min-h-[40px] min-w-[40px]" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="xl:hidden border-t border-white/10 bg-navy-950 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Main">
          {ITEMS.map(({ id, key, icon: Icon }) => (
            <a
              key={id}
              href={'#/' + id}
              onClick={() => setOpen(false)}
              className={cx('flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold', page === id ? 'bg-white text-navy-900' : 'bg-white/5 text-navy-100 hover:bg-white/10')}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {t(key)}
            </a>
          ))}
          <p className="col-span-full flex items-center gap-2 text-[11px] text-navy-300 pt-1">
            <span className={cx('w-2.5 h-2.5 rounded-full', dot)} /> {dotText}
          </p>
        </nav>
      )}
    </header>
  );
};
