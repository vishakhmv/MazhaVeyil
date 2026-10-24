import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ScanLine, Camera, FileText, ShieldCheck, ShieldAlert, ArrowRight, Upload, CheckCircle2, AlertTriangle, XCircle, Lock, Keyboard } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { community, engine } from '../lib/api.js';
import { Hero, Page, Card, CardTitle, Btn, Chip, Notice, Spinner, Field, Segmented, Stat, inputCls, EngineDown } from '../components/ui.jsx';
import { inr, num, numT } from '../lib/format.js';

// Photos are shrunk in the browser before upload: faster over a hotspot and nothing larger than needed leaves the phone
async function shrink(file, maxSide = 1600) {
  if (!file.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'bill.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export default function ScanBill() {
  const { t } = useLang();
  const { units, setUnits, go, status } = useApp();
  const [samples, setSamples] = useState(null);
  const [samplesErr, setSamplesErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(null); // what the reader found
  const [check, setCheck] = useState(null); // what our rules say about it
  const [error, setError] = useState(null);
  const [manual, setManual] = useState({ units: '', amount: '', months: 1 });
  const [via, setVia] = useState(null); // photo | sample | typed
  const fileRef = useRef(null);

  useEffect(() => {
    community.billSamples().then((r) => setSamples(r.samples)).catch((e) => setSamplesErr(e));
  }, []);

  // AI reads, rules check: whatever the reader found goes through the engine's own tariff calculation
  const verify = async (s) => {
    setScan(s);
    setCheck(null);
    // The reader could not find the units (blurry, cropped, not a bill): do not run a check on nothing, and offer no "use these units"
    if (s.units === null || s.units === undefined || !(s.units >= 0)) {
      setCheck({ status: 'reject', warnings: [] });
      return;
    }
    try {
      const c = await engine.billCheck({ units: s.units, amount: s.amount, period_months: s.months_in_bill === 2 ? 2 : 1, phase: units.phase });
      setCheck(c);
    } catch (e) {
      setError(e);
    }
  };

  const run = async (fn, how) => {
    setVia(how);
    setBusy(true);
    setError(null);
    setScan(null);
    setCheck(null);
    try {
      await verify(await fn());
    } catch (e) {
      setError(e);
      if (!e.offline) toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    run(async () => community.billScan(await shrink(f)), 'photo');
  };
  const loadSample = (id) => run(() => community.billSample(id), 'sample');
  const submitManual = (e) => {
    e.preventDefault();
    const u = Number(manual.units);
    if (!(u >= 0) || manual.units === '') { toast.error(t('scan.need_units')); return; }
    run(async () => ({ units: u, amount: manual.amount === '' ? null : Number(manual.amount), months_in_bill: manual.months, confidence: 'high', warnings: [], source: 'typed' }), 'typed');
  };

  const accept = () => {
    setUnits({ value: scan.units, months: scan.months_in_bill === 2 ? 2 : 1 });
    toast.success(t('scan.units_saved'));
    go('cliff');
  };

  // With no AI key on the community service, a photo is answered with its built-in sample bill (262 units, 3rd-party sample consumer number).
  // Say so instead of presenting that as a reading of the photo.
  const sample1 = samples?.find((x) => x.id === 'sample-1');
  const photoIsSample = via === 'photo' && scan && (scan.source === 'sample_fallback' || (scan.source === undefined && ((sample1 && scan.units === sample1.units && scan.amount === sample1.amount) || (scan.units === 262 && scan.amount === 2013))));

  const verdict = check && { ok: [CheckCircle2, 'leaf', t('scan.ok')], warn: [AlertTriangle, 'sun', t('scan.warn')], reject: [XCircle, 'cliff', t('scan.reject')] }[check.status];

  return (
    <>
      <Hero icon={ScanLine} eyebrow={t('scan.eyebrow')} title={t('scan.title')} sub={t('scan.sub')} />
      <Page>
        {status.online === false && <EngineDown />}
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
          <div className="space-y-5">
            <Card className="p-5 space-y-4">
              <CardTitle icon={Camera} tone="rain">{t('scan.photo')}</CardTitle>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} aria-label={t('scan.photo')} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="w-full rounded-2xl border-2 border-dashed border-rain-300 bg-rain-50/50 hover:bg-rain-50 transition p-8 flex flex-col items-center gap-2 text-center min-h-[140px] disabled:opacity-60">
                <Upload className="w-8 h-8 text-rain-600" aria-hidden />
                <span className="font-bold text-navy-900">{t('scan.take_photo')}</span>
                <span className="text-xs text-slate-500">{t('scan.photo_hint')}</span>
              </button>
              <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed"><Lock className="w-4 h-4 shrink-0 text-leaf-600" aria-hidden />{t('scan.privacy')}</p>
            </Card>

            <Card className="p-5 space-y-3">
              <CardTitle icon={FileText} tone="sun">{t('scan.samples')}</CardTitle>
              <p className="text-sm text-slate-600">{t('scan.samples_sub')}</p>
              {!samples && !samplesErr && <Spinner />}
              {samplesErr && <Notice tone="sun" icon={ShieldAlert}>{t('scan.samples_down')}</Notice>}
              <div className="grid gap-2">
                {samples?.map((s) => (
                  <button key={s.id} type="button" onClick={() => loadSample(s.id)} disabled={busy}
                    className="text-left rounded-xl border border-navy-100 hover:border-rain-300 hover:bg-rain-50/40 transition p-3 flex items-center justify-between gap-3 min-h-[56px] disabled:opacity-60">
                    <span className="min-w-0">
                      <span className="block font-bold text-navy-900 text-sm leading-snug">{s.name}</span>
                      <span className="block text-xs text-slate-500">{num(s.units)} {t('unit.units')} · {inr(s.amount)} · {s.months_in_bill} {t(s.months_in_bill === 2 ? 'scan.months_many' : 'scan.months_one')}</span>
                    </span>
                    <Chip tone={s.badge_color === 'red' ? 'cliff' : s.badge_color === 'green' ? 'leaf' : 'sun'}>{s.badge}</Chip>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <CardTitle icon={Keyboard} tone="navy">{t('scan.manual')}</CardTitle>
              <form onSubmit={submitManual} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('scan.m_units')}><input className={inputCls} type="number" inputMode="numeric" min="0" value={manual.units} onChange={(e) => setManual({ ...manual, units: e.target.value })} /></Field>
                  <Field label={t('scan.m_amount')}><input className={inputCls} type="number" inputMode="decimal" min="0" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} /></Field>
                </div>
                <Segmented value={manual.months} onChange={(v) => setManual({ ...manual, months: v })} options={[{ value: 1, label: t('units.monthly') }, { value: 2, label: t('units.bimonthly') }]} />
                <Btn type="submit" variant="primary" icon={ShieldCheck} loading={busy} className="w-full">{t('scan.check')}</Btn>
              </form>
            </Card>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            {busy && <Card className="p-8"><Spinner label={t('scan.reading')} /></Card>}
            {error && <Notice tone="cliff" title={t('scan.error')}>{error.message}{error.status === 404 || error.offline ? <span className="block mt-1">{t('scan.error_hint')}</span> : null}</Notice>}
            {!scan && !busy && !error && (
              <Card className="p-8 text-center space-y-3 text-slate-500">
                <ScanLine className="w-12 h-12 mx-auto text-navy-300" aria-hidden />
                <p className="font-bold text-navy-900">{t('scan.empty_title')}</p>
                <p className="text-sm">{t('scan.empty_body')}</p>
              </Card>
            )}
            {scan && (
              <Card className="p-5 sm:p-6 space-y-5 mv-rise">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle icon={ScanLine} tone="rain">{t('scan.found')}</CardTitle>
                  <div className="flex gap-2">
                    {scan.consumer_no_masked && <Chip tone="slate">{scan.consumer_no_masked}</Chip>}
                    <Chip tone={scan.confidence === 'high' ? 'leaf' : 'sun'}>{t('scan.confidence_' + (scan.confidence || 'low'))}</Chip>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat tone="rain" label={t('scan.m_units')} value={num(scan.units)} sub={scan.months_in_bill === 2 ? t('scan.two_month') : t('scan.one_month')} />
                  <Stat tone="navy" label={t('scan.m_amount')} value={scan.amount != null ? inr(scan.amount) : '–'} />
                  <Stat tone="navy" label={t('scan.monthly_use')} value={scan.units == null ? '–' : numT(scan.units / (scan.months_in_bill === 2 ? 2 : 1), 1)} sub={t('scan.per_month')} />
                </div>

                {photoIsSample && <Notice tone="cliff" icon={AlertTriangle} title={t('scan.no_key_title')}>{t('scan.no_key_body')}</Notice>}
                {!check && !error && <Spinner label={t('scan.checking')} />}
                {check && check.status !== 'reject' && (
                  <div className="space-y-3">
                    <Notice tone={verdict[1]} icon={verdict[0]} title={verdict[2]}>
                      {check.diff_pct !== null ? t('scan.diff', { amount: num(check.amount), expected: num(check.expected_total), pct: Math.abs(check.diff_pct) }) : t('scan.no_amount')}
                    </Notice>
                    <dl className="text-sm grid grid-cols-3 gap-2 rounded-xl bg-navy-50/60 border border-navy-100 p-3">
                      <div><dt className="text-xs text-slate-500">{t('cliff.energy')}</dt><dd className="font-bold tabular-nums">{inr(check.expected_breakdown.energy, 2)}</dd></div>
                      <div><dt className="text-xs text-slate-500">{t('cliff.fixed')}</dt><dd className="font-bold tabular-nums">{inr(check.expected_breakdown.fixed, 2)}</dd></div>
                      <div><dt className="text-xs text-slate-500">{t('cliff.duty')}</dt><dd className="font-bold tabular-nums">{inr(check.expected_breakdown.duty, 2)}</dd></div>
                    </dl>
                    {check.warnings.filter((w) => w.key !== 'bill.amount_differs').length > 0 && (
                      <ul className="space-y-1.5">{check.warnings.filter((w) => w.key !== 'bill.amount_differs').map((w, i) => <li key={i} className="flex gap-2 text-sm text-navy-900 rounded-lg bg-sun-50 border border-sun-100 p-2.5"><AlertTriangle className="w-4 h-4 text-sun-600 shrink-0 mt-0.5" aria-hidden />{t(w.key, w.params)}</li>)}</ul>
                    )}
                    <p className="text-xs text-slate-500 leading-relaxed">{t('scan.rules_note')}</p>
                  </div>
                )}
                {check?.status === 'reject' && <Notice tone="cliff" icon={XCircle} title={t('scan.reject')}>{t('scan.reject_body')}</Notice>}

                {scan.warnings?.length > 0 && (
                  <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer font-semibold">{t('scan.reader_notes')}</summary>
                    <ul className="mt-1 space-y-1 list-disc pl-5">{scan.warnings.map((w, i) => <li key={i}>{String(w).replace(/^[a-z0-9_]+:\s*/i, '')}</li>)}</ul>
                  </details>
                )}

                {check && check.status !== 'reject' && !photoIsSample && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Btn variant="rain" icon={ArrowRight} onClick={accept}>{t('scan.use_units')}</Btn>
                    <Btn variant="outline" onClick={() => { setUnits({ value: scan.units, months: scan.months_in_bill === 2 ? 2 : 1 }); go('find'); }}>{t('scan.to_roof')}</Btn>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
