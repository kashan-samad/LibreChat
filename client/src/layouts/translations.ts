import type { Resource } from 'i18next';
// Import translations from all layout folders
import trivagoUITranslationEn from '~/layouts/trivago-ui/locales/en/translation.json';
import testUITranslationEn from '~/layouts/test-ui/locales/en/translation.json';

/**
 * Merges layout translations into the main translation resources.
 * All layout translation keys are prefixed with their folder name to keep them separate.
 *
 * @param resources - The main i18n resources object
 * @returns The resources object with merged layout translations
 */
export function mergeTranslations(resources: Resource): Resource {
  // Define layout translations with their prefixes
  const layoutTranslations: Record<
    string,
    { prefix: string; translations: Record<string, Record<string, string>> }
  > = {
    trivago_ui: {
      prefix: 'trivago_ui_',
      translations: {
        en: trivagoUITranslationEn,
      },
    },
    test_ui: {
      prefix: 'test_ui_',
      translations: {
        en: testUITranslationEn,
      },
    },
  };

  // Merge translations for each language in resources
  Object.keys(resources).forEach((lang) => {
    const resource = resources[lang];
    if (!resource?.translation || typeof resource.translation !== 'object') {
      return;
    }

    // Process each layout
    Object.values(layoutTranslations).forEach(({ prefix, translations }) => {
      // Get translations for this language, fallback to English
      const translationsForLang = translations[lang] || translations.en || {};

      // Prefix all keys and merge into main translations
      const prefixedTranslations: Record<string, string> = {};
      Object.keys(translationsForLang).forEach((key) => {
        prefixedTranslations[`${prefix}${key}`] = translationsForLang[key];
      });

      // Merge into existing translations
      resources[lang].translation = {
        ...(resource.translation as Record<string, string>),
        ...prefixedTranslations,
      };
    });
  });

  return resources;
}
