import type { Resource } from 'i18next';

/**
 * Type for layout translation merge functions.
 * Each layout should export a function with this signature from `mergeTranslations.ts`.
 */
export type LayoutTranslationMerger = (resources: Resource) => Resource;

/**
 * Import layout merge function.
 * The mergeTranslations function handles all layouts automatically.
 */
import { mergeTranslations } from '../layouts/mergeTranslations';

/**
 * Registry of layout translation merge functions.
 */
const layoutMergers: LayoutTranslationMerger[] = [mergeTranslations];

/**
 * Loads and applies all registered layout translation merge functions.
 * This function is called during i18n initialization to merge layout-specific translations.
 *
 * @param resources - The main i18n resources object
 * @returns The resources object with all layout translations merged
 */
export function loadLayoutTranslationsSync(resources: Resource): Resource {
  let mergedResources = resources;

  // Apply all registered layout merge functions
  for (let i = 0; i < layoutMergers.length; i++) {
    mergedResources = layoutMergers[i](mergedResources);
  }

  return mergedResources;
}
