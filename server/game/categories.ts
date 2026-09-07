import categoryData from '../../data/categories.json'

interface CategoryData {
  categories: string[]
}

export const categories = Object.freeze(
  (categoryData as CategoryData).categories.filter(category => category.trim().length > 0),
)

function randomIndex(length: number): number {
  if (length <= 1)
    return 0

  const range = 0x1_0000_0000
  const limit = Math.floor(range / length) * length
  const randomValues = new Uint32Array(1)
  let value = 0

  do {
    crypto.getRandomValues(randomValues)
    value = randomValues[0] ?? 0
  } while (value >= limit)

  return value % length
}

export function nextCategory(usedCategories: readonly string[]): { category: string, usedCategories: string[] } {
  const used = new Set(usedCategories.filter(category => categories.includes(category)))
  const available = categories.filter(category => !used.has(category))
  const pool = available.length > 0 ? available : [...categories]
  const category = pool[randomIndex(pool.length)] ?? categories[0] ?? 'Tiere'

  return {
    category,
    usedCategories: available.length > 0 ? [...used, category] : [category],
  }
}
