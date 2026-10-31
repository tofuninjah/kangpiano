// Korean particles change with the sound they follow: 은 and 과 after a final
// consonant (받침), 는 and 와 after a vowel. Town names come from the
// schedule data, so sentences built from them pick the particle here rather
// than hard-coding one that's right only for today's towns.

const FIRST_SYLLABLE = 0xac00; // 가
const LAST_SYLLABLE = 0xd7a3; // 힣
const FINALS_PER_SYLLABLE = 28;

/** Whether the last Hangul syllable ends in a consonant. */
export function endsInConsonant(word: string): boolean {
  const code = word.trim().codePointAt(word.trim().length - 1) ?? 0;
  if (code < FIRST_SYLLABLE || code > LAST_SYLLABLE) {
    throw new Error(`Expected Hangul at the end of "${word}"`);
  }
  return (code - FIRST_SYLLABLE) % FINALS_PER_SYLLABLE !== 0;
}

const PARTICLES = {
  /** Topic marker: 카폴레이는, 서울은. */
  topic: { consonant: '은', vowel: '는' },
  /** "And" between nouns: 카폴레이와, 서울과. */
  and: { consonant: '과', vowel: '와' },
} as const;

/** The word followed by the right form of the particle. */
export function withParticle(
  word: string,
  particle: keyof typeof PARTICLES
): string {
  const forms = PARTICLES[particle];
  return `${word}${endsInConsonant(word) ? forms.consonant : forms.vowel}`;
}

/** "A", "A와 B", "A, B와 C". */
export function koreanList(items: readonly string[]): string {
  if (items.length < 2) return items.join('');
  const head = items.slice(0, -1);
  const last = items.at(-1)!;
  const lead = [...head.slice(0, -1), withParticle(head.at(-1)!, 'and')];
  return `${lead.join(', ')} ${last}`;
}
