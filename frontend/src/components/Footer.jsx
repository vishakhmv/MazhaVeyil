import React from 'react';
import { useT } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { Logo } from './Navbar.jsx';

export const Footer = () => {
  const t = useT();
  const { status } = useApp();
  return (
    <footer className="bg-navy-950 text-navy-200 mt-10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-6 md:grid-cols-[1.2fr_1fr_1fr] text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-3"><Logo size={36} /><span className="font-extrabold text-white text-lg">MazhaVeyil</span></div>
          <p className="text-navy-300 leading-relaxed max-w-sm">{t('footer.tagline')}</p>
          <p className="text-xs text-navy-400">{t('footer.sdg')}</p>
        </div>
        <div className="space-y-2">
          <p className="font-bold text-white">{t('footer.sources_title')}</p>
          <p className="text-navy-300 leading-relaxed text-xs">{t('footer.sources')}</p>
          {status.rulesDate && <p className="text-xs text-sun-300 font-semibold">{t('footer.rates_checked', { date: status.rulesDate })}</p>}
        </div>
        <div className="space-y-2">
          <p className="font-bold text-white">{t('footer.safety_title')}</p>
          <p className="text-navy-300 leading-relaxed text-xs">{t('footer.safety')}</p>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-navy-400 py-4">{t('footer.team')}</div>
    </footer>
  );
};
