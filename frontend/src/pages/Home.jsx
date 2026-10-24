import React from 'react';
import { MapPin, Gauge, ScanLine, Clock, CloudSun, Users, Layers, ArrowRight, Zap, Droplets, CloudRain, Sun, ShieldCheck, WifiOff, Lock, Building2, Home as HomeIcon, Languages } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { Card, Btn, Chip, cx } from '../components/ui.jsx';
import { ScoreRings } from '../components/charts.jsx';

export default function Home() {
  const { t, lang } = useLang();
  const { go, areas, setRoof, setReport } = useApp();

  const tryArea = (a) => {
    setRoof({ areaId: a.id, roofId: null, polygon: null, areaM2: null, point: null, use: a.kind });
    setReport(null);
    go('find');
  };

  const facts = [
    { icon: Zap, tone: 'sun', big: '~6,200 MW', title: t('home.f1_title'), body: t('home.f1_body'), src: t('home.f1_src') },
    { icon: Droplets, tone: 'rain', big: '2–3', title: t('home.f2_title'), body: t('home.f2_body'), src: t('home.f2_src') },
    { icon: CloudRain, tone: 'rain', big: '−28%', title: t('home.f3_title'), body: t('home.f3_body'), src: t('home.f3_src') },
    { icon: Sun, tone: 'sun', big: '36%', title: t('home.f4_title'), body: t('home.f4_body'), src: t('home.f4_src') },
  ];
  const features = [
    { id: 'find', icon: MapPin, color: 'bg-navy-800', k: 'find' },
    { id: 'cliff', icon: Gauge, color: 'bg-cliff-500', k: 'cliff' },
    { id: 'scan', icon: ScanLine, color: 'bg-rain-600', k: 'scan' },
    { id: 'veyil', icon: Clock, color: 'bg-sun-500', k: 'veyil' },
    { id: 'today', icon: CloudSun, color: 'bg-leaf-600', k: 'today' },
    { id: 'koottam', icon: Users, color: 'bg-rain-700', k: 'koottam' },
    { id: 'atlas', icon: Layers, color: 'bg-navy-600', k: 'atlas' },
  ];
  const tone = { sun: 'text-sun-600 bg-sun-50 border-sun-100', rain: 'text-rain-600 bg-rain-50 border-rain-100' };

  return (
    <div className="pb-6">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-sun-400/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-rain-400/20 blur-3xl" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
          <div className="space-y-6">
            <Chip tone="sun" className="!bg-white/10 !text-sun-200 !border-white/15 !text-xs !px-3 !py-1">{t('home.eyebrow')}</Chip>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-balance">
              {t('home.h1_a')} <span className="text-sun-300">{t('home.h1_b')}</span>
            </h1>
            <p className="text-lg sm:text-xl text-navy-100 max-w-2xl leading-relaxed">{t('home.lead')}</p>
            <p className="text-base sm:text-lg font-bold text-rain-200">{lang === 'en' ? 'നിങ്ങളുടെ മേൽക്കൂര, നിങ്ങളുടെ വെളിച്ചം, നിങ്ങളുടെ വെള്ളം' : 'Your roof. Your light. Your water.'}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Btn variant="sun" size="lg" icon={MapPin} onClick={() => go('find')}>{t('home.cta_roof')}</Btn>
              <Btn variant="outline" size="lg" icon={Gauge} onClick={() => go('cliff')} className="!bg-white/10 !text-white !border-white/25 hover:!bg-white/20">{t('home.cta_cliff')}</Btn>
            </div>
            {areas.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-navy-300 mb-2">{t('home.try_demo')}</p>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <button key={a.id} type="button" onClick={() => tryArea(a)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold min-h-[44px] transition">
                      {a.kind === 'public' ? <Building2 className="w-4 h-4 text-rain-200" aria-hidden /> : <HomeIcon className="w-4 h-4 text-sun-300" aria-hidden />}
                      {a.name[lang] || a.name.en}<ArrowRight className="w-4 h-4 opacity-60" aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="rounded-[2rem] bg-white p-7 shadow-2xl text-navy-900 w-[340px]">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 text-center">{t('home.example')}</p>
              <ScoreRings power={100} water={80} score={90} bandLabel={t('band.strong')} scoreLabel={t('rep.score')} size={260} />
              <div className="flex justify-center gap-5 text-xs font-bold mt-1">
                <span className="flex items-center gap-1.5 text-sun-700"><i className="w-3 h-3 rounded-full bg-sun-400" />{t('rep.power')}</span>
                <span className="flex items-center gap-1.5 text-rain-700"><i className="w-3 h-3 rounded-full bg-rain-500" />{t('rep.water')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-rain-600">{t('home.why_eyebrow')}</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-1 text-balance">{t('home.why_title')}</h2>
          <p className="text-slate-600 mt-3 leading-relaxed">{t('home.why_sub')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
          {facts.map((f) => (
            <Card key={f.title} className="p-5 flex flex-col gap-2">
              <span className={cx('w-10 h-10 rounded-xl border flex items-center justify-center', tone[f.tone])}><f.icon className="w-5 h-5" aria-hidden /></span>
              <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{f.big}</p>
              <p className="font-bold text-navy-900 leading-snug">{f.title}</p>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">{f.body}</p>
              <p className="text-[11px] text-slate-400 leading-snug border-t border-navy-50 pt-2">{f.src}</p>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-lg font-bold text-navy-800 text-center text-balance">{t('home.answer')}</p>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 text-balance">{t('home.what_title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-7">
          {features.map((f) => (
            <button key={f.id} type="button" onClick={() => go(f.id)} className="group text-left bg-white rounded-2xl border border-navy-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition p-5 flex flex-col gap-3 min-h-[170px]">
              <span className={cx('w-11 h-11 rounded-xl text-white flex items-center justify-center', f.color)}><f.icon className="w-5 h-5" aria-hidden /></span>
              <span className="font-extrabold text-navy-900 text-lg leading-tight">{t('feat.' + f.k + '_title')}</span>
              <span className="text-sm text-slate-600 leading-relaxed flex-1">{t('feat.' + f.k + '_body')}</span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-rain-700 group-hover:gap-2.5 transition-all">{t('home.open')}<ArrowRight className="w-4 h-4" aria-hidden /></span>
            </button>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="rounded-3xl bg-navy-950 text-white p-6 sm:p-10 grid md:grid-cols-4 gap-6">
          {[
            [ShieldCheck, 'home.t1'],
            [Sun, 'home.t2'],
            [WifiOff, 'home.t3'],
            [Lock, 'home.t4'],
          ].map(([Icon, k]) => (
            <div key={k} className="space-y-2">
              <Icon className="w-7 h-7 text-sun-300" aria-hidden />
              <p className="font-extrabold">{t(k + '_title')}</p>
              <p className="text-sm text-navy-200 leading-relaxed">{t(k + '_body')}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-5 flex items-center justify-center gap-2"><Languages className="w-4 h-4" aria-hidden />{t('home.lang_note')}</p>
      </section>
    </div>
  );
}
