// Korean particles chosen from the sound before them, for sentences built
// from schedule data.
import { describe, expect, it } from 'vitest';
import {
  endsInConsonant,
  koreanList,
  koreanRo,
  withParticle,
} from '../src/lib/korean';

describe('endsInConsonant', () => {
  it('reads the final consonant of the last syllable', () => {
    expect(endsInConsonant('카폴레이')).toBe(false);
    expect(endsInConsonant('밀릴라니')).toBe(false);
    expect(endsInConsonant('에바 비치')).toBe(false);
    expect(endsInConsonant('서울')).toBe(true);
    expect(endsInConsonant('대전')).toBe(true);
    expect(endsInConsonant('펄 시티 ')).toBe(false);
  });

  it('refuses a word that does not end in Hangul', () => {
    expect(() => endsInConsonant('Kapolei')).toThrow(/Hangul/);
    expect(() => endsInConsonant('')).toThrow(/Hangul/);
  });
});

describe('withParticle', () => {
  it('picks 는 or 은 for the topic', () => {
    expect(withParticle('카폴레이', 'topic')).toBe('카폴레이는');
    expect(withParticle('서울', 'topic')).toBe('서울은');
  });

  it('picks 와 or 과 for "and"', () => {
    expect(withParticle('에바 비치', 'and')).toBe('에바 비치와');
    expect(withParticle('서울', 'and')).toBe('서울과');
  });
});

describe('koreanList', () => {
  it('joins one, two or more names', () => {
    expect(koreanList([])).toBe('');
    expect(koreanList(['밀릴라니'])).toBe('밀릴라니');
    expect(koreanList(['에바 비치', '카폴레이'])).toBe('에바 비치와 카폴레이');
    expect(koreanList(['서울', '대전', '부산'])).toBe('서울, 대전과 부산');
  });
});

describe('koreanRo', () => {
  it('reads the last digit aloud: 으로 after 영, 삼, 육, 로 otherwise', () => {
    const expected = [
      '으로',
      '로',
      '로',
      '으로',
      '로',
      '로',
      '으로',
      '로',
      '로',
      '로',
    ];
    expected.forEach((particle, digit) => {
      expect(koreanRo(`371-070${digit}`), String(digit)).toBe(
        `371-070${digit}${particle}`
      );
    });
  });

  it('follows the site’s own number', () => {
    expect(koreanRo('(808) 371-0708')).toBe('(808) 371-0708로');
  });

  it('refuses a number that does not end in a digit', () => {
    expect(() => koreanRo('371-0708 ext')).toThrow(/digit/);
    expect(() => koreanRo('')).toThrow(/digit/);
  });
});
