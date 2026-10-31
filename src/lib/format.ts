type ListType = 'conjunction' | 'disjunction';

/** "A", "A and B", "A, B, and C" (or "&" with the short style). */
export function formatList(
  items: readonly string[],
  type: ListType = 'conjunction',
  style: 'long' | 'short' = 'long'
): string {
  return new Intl.ListFormat('en', { style, type }).format(items);
}

/**
 * Like formatList, but keeps a comma before "and"/"or" when there are only
 * two items. The items here are whole clauses, and two of them joined by a
 * bare "and" next to another "and" reads as a run-on.
 */
export function joinClauses(
  clauses: readonly string[],
  word: 'and' | 'or'
): string {
  if (clauses.length === 2) return `${clauses[0]}, ${word} ${clauses[1]}`;
  return formatList(clauses, word === 'and' ? 'conjunction' : 'disjunction');
}
