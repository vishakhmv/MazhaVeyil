import React from 'react';
import { Loader2, AlertTriangle, Info, CheckCircle2, WifiOff, RefreshCw } from 'lucide-react';
import { useT } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';

export const cx = (...a) => a.filter(Boolean).join(' ');

export const Page = ({ children, className }) => (
  <div className={cx('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6', className)}>{children}</div>
);

// The band at the top of every page: navy with a sun and a rain glow (the product's two-colour motif)
export const Hero = ({ icon: Icon, eyebrow, title, sub, children }) => (
  <section className="relative overflow-hidden bg-navy-950 text-white no-print">
    <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-sun-400/20 blur-3xl" aria-hidden />
    <div className="absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-rain-400/20 blur-3xl" aria-hidden />
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
            <Icon className="w-6 h-6 text-sun-300" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-bold tracking-widest uppercase text-rain-200">{eyebrow}</p>}
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 text-balance">{title}</h1>
          {sub && <p className="text-sm sm:text-base text-navy-200 mt-2 max-w-3xl leading-relaxed">{sub}</p>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  </section>
);

export const Card = ({ className, children, ...rest }) => (
  <div className={cx('bg-white rounded-2xl border border-navy-100 shadow-sm print-card', className)} {...rest}>{children}</div>
);

export const CardTitle = ({ icon: Icon, tone = 'navy', children, aside }) => {
  const tones = { navy: 'bg-navy-50 text-navy-700', sun: 'bg-sun-100 text-sun-700', rain: 'bg-rain-100 text-rain-700', leaf: 'bg-leaf-100 text-leaf-700', cliff: 'bg-cliff-100 text-cliff-600' };
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <span className={cx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', tones[tone])}><Icon className="w-4 h-4" aria-hidden /></span>}
        <h3 className="font-bold text-navy-900 text-base sm:text-lg leading-tight">{children}</h3>
      </div>
      {aside}
    </div>
  );
};

export const Stat = ({ label, value, sub, tone = 'navy', big }) => {
  const tones = {
    navy: 'bg-navy-50/70 border-navy-100 text-navy-900',
    sun: 'bg-sun-50 border-sun-100 text-sun-700',
    rain: 'bg-rain-50 border-rain-100 text-rain-700',
    leaf: 'bg-leaf-50 border-leaf-100 text-leaf-700',
    cliff: 'bg-cliff-50 border-cliff-100 text-cliff-600',
  };
  return (
    <div className={cx('rounded-xl border p-3.5', tones[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('font-extrabold tabular-nums leading-tight mt-0.5', big ? 'text-3xl' : 'text-xl')}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
};

export const Chip = ({ tone = 'navy', children, icon: Icon, className }) => {
  const tones = {
    navy: 'bg-navy-50 text-navy-700 border-navy-100',
    sun: 'bg-sun-50 text-sun-700 border-sun-200',
    rain: 'bg-rain-50 text-rain-700 border-rain-200',
    leaf: 'bg-leaf-50 text-leaf-700 border-leaf-100',
    cliff: 'bg-cliff-50 text-cliff-600 border-cliff-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border', tones[tone], className)}>
      {Icon && <Icon className="w-3 h-3" aria-hidden />}
      {children}
    </span>
  );
};

export const Btn = ({ variant = 'primary', size = 'md', icon: Icon, className, children, loading, ...rest }) => {
  const v = {
    primary: 'bg-navy-800 hover:bg-navy-700 text-white shadow-sm',
    sun: 'bg-sun-400 hover:bg-sun-300 text-navy-950 shadow-sm',
    rain: 'bg-rain-600 hover:bg-rain-500 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-navy-50 text-navy-700',
    outline: 'bg-white hover:bg-navy-50 text-navy-800 border border-navy-200',
    danger: 'bg-cliff-500 hover:bg-cliff-600 text-white',
  }[variant];
  const s = { sm: 'text-xs px-3 py-1.5 rounded-lg', md: 'text-sm px-4 py-2.5 rounded-xl', lg: 'text-base px-6 py-3.5 rounded-xl' }[size];
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-2 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]', v, s, className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : Icon ? <Icon className="w-4 h-4" aria-hidden /> : null}
      {children}
    </button>
  );
};

export const Segmented = ({ value, onChange, options, className }) => (
  <div role="group" className={cx('inline-flex p-1 rounded-xl bg-navy-50 border border-navy-100 gap-1', className)}>
    {options.map((o) => (
      <button
        key={String(o.value)}
        type="button"
        aria-pressed={value === o.value}
        onClick={() => onChange(o.value)}
        className={cx('px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition min-h-[36px]', value === o.value ? 'bg-white text-navy-900 shadow-sm ring-1 ring-navy-100' : 'text-navy-500 hover:text-navy-800')}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const Field = ({ label, hint, children, right }) => (
  <label className="block space-y-1.5">
    <span className="flex items-center justify-between gap-2 text-sm font-bold text-navy-800">
      <span>{label}</span>
      {right}
    </span>
    {children}
    {hint && <span className="block text-xs text-slate-500 leading-snug">{hint}</span>}
  </label>
);

export const inputCls = 'w-full bg-white border border-navy-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-navy-900 placeholder:text-slate-400 focus:border-rain-500 focus:ring-2 focus:ring-rain-200 outline-none min-h-[44px]';

export const Notice = ({ tone = 'sun', icon: Icon, title, children, className }) => {
  const tones = {
    sun: 'bg-sun-50 border-sun-200 text-sun-700',
    rain: 'bg-rain-50 border-rain-200 text-rain-700',
    leaf: 'bg-leaf-50 border-leaf-100 text-leaf-700',
    cliff: 'bg-cliff-50 border-cliff-100 text-cliff-600',
    navy: 'bg-navy-50 border-navy-100 text-navy-700',
  };
  const I = Icon || (tone === 'cliff' ? AlertTriangle : tone === 'leaf' ? CheckCircle2 : Info);
  return (
    <div className={cx('rounded-xl border p-3.5 flex gap-3 text-sm', tones[tone], className)} role={tone === 'cliff' ? 'alert' : undefined}>
      <I className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-bold text-navy-900 mb-0.5">{title}</p>}
        <div className="leading-relaxed text-navy-800/90">{children}</div>
      </div>
    </div>
  );
};

export const Spinner = ({ label }) => (
  <div className="flex items-center justify-center gap-3 py-10 text-navy-500" role="status">
    <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
    {label && <span className="text-sm font-semibold">{label}</span>}
  </div>
);

export const Progress = ({ value, max = 100, tone = 'rain', className }) => {
  const tones = { rain: 'bg-rain-500', sun: 'bg-sun-400', leaf: 'bg-leaf-500', navy: 'bg-navy-700', cliff: 'bg-cliff-500' };
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx('h-3 rounded-full bg-navy-100 overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx('h-full rounded-full transition-all duration-700', tones[tone])} style={{ width: w + '%' }} />
    </div>
  );
};

// Shown whenever the engine is unreachable: no silent fake numbers anywhere in the app
export const EngineDown = ({ error, onRetry }) => {
  const t = useT();
  const { ping } = useApp();
  return (
    <Notice tone="cliff" icon={WifiOff} title={t('common.engine_down_title')}>
      <p>{t('common.engine_down_body')}</p>
      {error?.message && <p className="text-xs mt-1 opacity-80">{error.message}</p>}
      <Btn size="sm" variant="outline" icon={RefreshCw} className="mt-2" onClick={() => { ping(); onRetry?.(); }}>{t('common.retry')}</Btn>
    </Notice>
  );
};
