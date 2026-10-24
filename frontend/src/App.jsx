import React, { Suspense, lazy } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppProvider, useApp } from './state.jsx';
import { LangProvider, useT } from './i18n/index.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';
import { Spinner } from './components/ui.jsx';

// One chunk per page: the map code (Leaflet) is only downloaded when a map page opens
const pages = {
  home: lazy(() => import('./pages/Home.jsx')),
  find: lazy(() => import('./pages/FindYourRoof.jsx')),
  cliff: lazy(() => import('./pages/CliffMeter.jsx')),
  scan: lazy(() => import('./pages/ScanBill.jsx')),
  veyil: lazy(() => import('./pages/VeyilSamayam.jsx')),
  today: lazy(() => import('./pages/TodayOnYourRoof.jsx')),
  koottam: lazy(() => import('./pages/Koottam.jsx')),
  atlas: lazy(() => import('./pages/WardAtlas.jsx')),
};

function Shell() {
  const { page } = useApp();
  const t = useT();
  const Page = pages[page] || pages.home;
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }} className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:bg-white focus:p-3 focus:rounded-lg">
        {t('common.skip')}
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-grow outline-none">
        <Suspense fallback={<Spinner label={t('common.loading')} />}>
          <div key={page} className="mv-rise"><Page /></div>
        </Suspense>
      </main>
      <Footer />
      <ToastContainer position="bottom-center" autoClose={3500} newestOnTop closeOnClick pauseOnFocusLoss={false} theme="colored" className="no-print" />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </LangProvider>
  );
}
