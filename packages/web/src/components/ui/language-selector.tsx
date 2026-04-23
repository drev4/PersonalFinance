import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  es: 'ES',
  en: 'EN',
};

export function LanguageSelector(): React.ReactElement {
  const { i18n } = useTranslation();
  const currentLang = (
    SUPPORTED_LANGUAGES.includes(i18n.language.slice(0, 2) as SupportedLanguage)
      ? i18n.language.slice(0, 2)
      : 'es'
  ) as SupportedLanguage;

  function handleChange(lang: SupportedLanguage): void {
    void i18n.changeLanguage(lang);
  }

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Seleccionar idioma / Select language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = currentLang === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleChange(lang)}
            aria-pressed={isActive}
            aria-label={lang === 'es' ? 'Cambiar a español' : 'Switch to English'}
            className={cn(
              'rounded px-2 py-1 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            )}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}
