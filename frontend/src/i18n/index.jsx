import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import uiEn from './ui.en.js';
import uiMl from './ui.ml.js';
// Messages the engine emits as keys (insights, alerts, bill warnings, safety lines...): shared with the engine team.
import engineEn from '../../../contracts/strings.en.json';
import engineMl from '../../../contracts/strings.ml.json';

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object') flatten(v, prefix + k + '.', out);
    else out[prefix + k] = v;
  }
  return out;
};

const DICT = {
  en: { ...flatten(engineEn), ...uiEn },
  ml: { ...flatten(engineMl), ...uiMl },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('mv_lang') === 'ml' ? 'ml' : 'en'; } catch { return 'en'; }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('mv_lang', lang); } catch { /* private window */ }
  }, [lang]);

  const t = useCallback(
    (key, params = {}) => {
      const raw = DICT[lang][key] ?? DICT.en[key];
      if (raw === undefined) return key; // visible, so a missing string is noticed in rehearsal
      return raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, name) => (params[name] === undefined || params[name] === null ? '' : String(params[name])));
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang: setLangState, t, toggle: () => setLangState((l) => (l === 'en' ? 'ml' : 'en')) }), [lang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;
export const hasKey = (key) => key in DICT.en;
