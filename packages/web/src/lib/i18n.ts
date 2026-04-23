import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',
    resources: {
      es: { common: esCommon, auth: esAuth },
      en: { common: enCommon, auth: enAuth },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'finanzas-lang',
    },
  });

export default i18n;
