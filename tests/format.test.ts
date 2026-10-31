import { describe, expect, it } from 'vitest';
import { formatList, joinClauses } from '../src/lib/format';

describe('formatList', () => {
  it('handles one, two and three items', () => {
    expect(formatList(['Mililani'])).toBe('Mililani');
    expect(formatList(['ʻEwa Beach', 'Kapolei'])).toBe(
      'ʻEwa Beach and Kapolei'
    );
    expect(formatList(['A', 'B', 'C'])).toBe('A, B, and C');
  });

  it('supports "or" and the short "&" style', () => {
    expect(formatList(['A', 'B'], 'disjunction')).toBe('A or B');
    expect(formatList(['Tue', 'Thu'], 'conjunction', 'short')).toBe(
      'Tue & Thu'
    );
  });
});

describe('joinClauses', () => {
  it('keeps a comma between exactly two clauses', () => {
    expect(joinClauses(['at A', 'at B'], 'and')).toBe('at A, and at B');
    expect(joinClauses(['at A', 'at B'], 'or')).toBe('at A, or at B');
  });

  it('falls back to a normal list otherwise', () => {
    expect(joinClauses(['at A'], 'and')).toBe('at A');
    expect(joinClauses(['at A', 'at B', 'at C'], 'or')).toBe(
      'at A, at B, or at C'
    );
  });
});
