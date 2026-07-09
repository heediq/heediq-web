import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
  // Single bundled namespace only (D-076) — permission keys like "sources:read" contain
  // a literal ':', which i18next's default nsSeparator would otherwise split on.
  nsSeparator: false,
})

export { i18n }
