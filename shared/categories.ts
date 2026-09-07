import categoryData from '../data/categories.json'

export type CategoryLocale = 'de' | 'en'

export interface CategoryEntry {
  de: string
  en: string
}

interface CategoryData {
  categories: CategoryEntry[]
}

/**
 * The German name is the stable key that the server stores and sends over the
 * wire. Clients look up the display name for their own locale.
 */
export const categoryEntries: readonly CategoryEntry[] = Object.freeze(
  (categoryData as CategoryData).categories.filter(entry => entry.de.trim().length > 0),
)

export const categoryKeys: readonly string[] = Object.freeze(categoryEntries.map(entry => entry.de))

const entriesByKey = new Map(categoryEntries.map(entry => [entry.de, entry]))

export function localizeCategory(key: string, locale: string): string {
  const entry = entriesByKey.get(key)
  if (!entry)
    return key
  return locale === 'en' ? entry.en : entry.de
}
