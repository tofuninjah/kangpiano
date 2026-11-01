// Enforces src/data/schedule.ts as the source of truth for where and when
// lessons happen, on the English and the Korean page. Each check fails in
// both directions: data the page leaves out, and anything the page shows
// that the data doesn't have.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Footer from '../src/components/Footer.astro';
import Hero from '../src/components/Hero.astro';
import Schedule from '../src/components/Schedule.astro';
import IndexPage from '../src/pages/index.astro';
import KoreanIndexPage from '../src/pages/ko/index.astro';
import { copy } from '../src/data/copy';
import { KOREAN_TOWN_NAMES } from '../src/data/copy/ko';
import { locations } from '../src/data/schedule';
import { formatList } from '../src/lib/format';
import { koreanList } from '../src/lib/korean';
import { allTowns, teachingSentence } from '../src/lib/schedule';

const en = { props: { locale: 'en' as const } };
const ko = { props: { locale: 'ko' as const } };

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Places near her teaching areas that copy could plausibly name, including
// the towns the 2016 site listed. Any of these on the page must be in the data.
const OAHU_TOWNS = [
  'ʻEwa Beach',
  'Kapolei',
  'Makakilo',
  'Mililani',
  'Schofield',
  'Wahiawā',
  'Waipahu',
  'Pearl City',
  'ʻAiea',
  'Honolulu',
  'Kunia',
  'Waiʻanae',
];

// The same names without ʻokina or kahakō. The lookbehind skips the correct
// spelling ("ʻEwa Beach" contains "Ewa Beach").
const BARE_SPELLINGS = ['Ewa Beach', 'Wahiawa\\b', 'Aiea', 'Waianae'].map(
  (bare) => new RegExp(`(?<!ʻ)\\b${bare}`)
);

const dayPattern = new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`, 'g');

// A town's text, including an English name nested in a lang="en" span.
const TOWN =
  /<span[^>]*\bdata-town\b[^>]*>((?:[^<]|<span lang="en">[^<]*<\/span>)*)<\/span>/g;

function townsIn(html: string): string[] {
  return [...html.matchAll(TOWN)].map((match) =>
    match[1]!.replace(/<[^>]+>/g, '').trim()
  );
}

/** The English names a block marks with lang="en". */
function englishIn(html: string): string[] {
  return [...html.matchAll(/<span lang="en">\(([^<]*)\)<\/span>/g)].map(
    (match) => match[1]!
  );
}

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('schedule section', () => {
  it('renders one block per location, in data order', async () => {
    const html = await container.renderToString(Schedule, en);
    const hosts = [...html.matchAll(/data-location="([^"]+)"/g)].map(
      (match) => match[1]
    );
    expect(hosts).toEqual(locations.map((location) => location.host));
  });

  it('shows exactly each location’s towns and days', async () => {
    const html = await container.renderToString(Schedule, en);
    const blocks = html.split('<article').slice(1);

    locations.forEach((location, index) => {
      const block = blocks[index]!;
      expect(townsIn(block)).toEqual([...location.towns]);
      expect([...block.matchAll(dayPattern)].map((match) => match[1])).toEqual([
        ...location.days,
      ]);
    });
  });
});

describe('copy derived from the schedule', () => {
  it('hero sentence names every location’s towns and nothing else', async () => {
    const html = await container.renderToString(Hero, en);
    const sentence = textOf(
      html.match(/<p[^>]*data-teaching[^>]*>([\s\S]*?)<\/p>/)![1]!
    );
    expect(sentence).toBe(teachingSentence());

    let rest = sentence;
    for (const location of locations) {
      const towns = formatList(location.towns);
      expect(rest).toContain(towns);
      rest = rest.replace(towns, '');
    }
    for (const town of OAHU_TOWNS) expect(rest).not.toContain(town);
  });

  it('footer lists exactly the schedule’s towns', async () => {
    const html = await container.renderToString(Footer, en);
    expect(townsIn(html)).toEqual(allTowns());
  });
});

describe('whole page', () => {
  it('names no town that the schedule does not have', async () => {
    const html = await container.renderToString(IndexPage);
    const text = textOf(html);
    const mentioned = OAHU_TOWNS.filter((town) => text.includes(town));
    expect(new Set(mentioned)).toEqual(new Set(allTowns()));
  });

  it('meta description covers every location', async () => {
    const html = await container.renderToString(IndexPage);
    const description = html.match(
      /<meta name="description" content="([^"]*)"/
    )![1]!;
    for (const location of locations) {
      expect(description).toContain(formatList(location.towns));
    }
    const mentioned = OAHU_TOWNS.filter((town) => description.includes(town));
    expect(new Set(mentioned)).toEqual(new Set(allTowns()));
  });

  it('spells Hawaiian place names with ʻokina and kahakō', async () => {
    const text = textOf(await container.renderToString(IndexPage));
    const bare = BARE_SPELLINGS.filter((pattern) => pattern.test(text));
    expect(bare.map(String)).toEqual([]);
  });

  it('mentions no lesson day that the schedule does not have', async () => {
    const html = await container.renderToString(IndexPage);
    const days = new Set(
      [...textOf(html).matchAll(dayPattern)].map((m) => m[1])
    );
    expect(days).toEqual(
      new Set(locations.flatMap((location) => location.days))
    );
  });
});

// Hangul spellings of the same nearby places, with common alternates.
const OAHU_TOWNS_KO = [
  '에바 비치',
  '에와 비치',
  '카폴레이',
  '마카킬로',
  '밀릴라니',
  '스코필드',
  '와히아와',
  '와이파후',
  '펄 시티',
  '아이에아',
  '호놀룰루',
  '쿠니아',
  '와이아나에',
];

const KO_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'].map(
  (day) => `${day}요일`
);
const koDayPattern = new RegExp(`(${KO_WEEKDAYS.join('|')})`, 'g');

const koreanName = (town: string) => KOREAN_TOWN_NAMES[town]!;

describe('Korean town names', () => {
  it('cover exactly the schedule’s towns', () => {
    expect(Object.keys(KOREAN_TOWN_NAMES).sort()).toEqual(
      [...allTowns()].sort()
    );
  });

  it('come from the nearby-town list the page checks below look for', () => {
    for (const name of Object.values(KOREAN_TOWN_NAMES)) {
      expect(OAHU_TOWNS_KO).toContain(name);
    }
  });
});

describe('Korean schedule section', () => {
  it('shows each location’s towns in Hangul with the English name, and its days', async () => {
    const html = await container.renderToString(Schedule, ko);
    const blocks = html.split('<article').slice(1);
    expect(blocks).toHaveLength(locations.length);

    locations.forEach((location, index) => {
      const block = blocks[index]!;
      expect(townsIn(block)).toEqual(
        location.towns.map((town) => `${koreanName(town)}(${town})`)
      );
      expect(englishIn(block)).toEqual([...location.towns]);
      expect([...block.matchAll(koDayPattern)].map((m) => m[1])).toEqual(
        location.days.map(copy.ko.dayName)
      );
    });
  });
});

describe('Korean copy derived from the schedule', () => {
  it('hero sentence names every location’s towns and nothing else', async () => {
    const html = await container.renderToString(Hero, ko);
    const sentence = textOf(
      html.match(/<p[^>]*data-teaching[^>]*>([\s\S]*?)<\/p>/)![1]!
    );
    expect(sentence).toBe(copy.ko.hero.teachingSentence);

    let rest = sentence;
    for (const location of locations) {
      const towns = koreanList(location.towns.map(koreanName));
      expect(rest).toContain(towns);
      rest = rest.replace(towns, '');
    }
    for (const town of OAHU_TOWNS_KO) expect(rest).not.toContain(town);
  });

  it('footer lists exactly the schedule’s towns', async () => {
    const html = await container.renderToString(Footer, ko);
    expect(townsIn(html)).toEqual(allTowns().map(koreanName));
  });
});

describe('whole Korean page', () => {
  let text: string;
  let description: string;

  beforeAll(async () => {
    const html = await container.renderToString(KoreanIndexPage, {
      request: new Request('http://localhost/ko'),
    });
    text = textOf(html);
    description = html.match(/<meta name="description" content="([^"]*)"/)![1]!;
  });

  it('names no town that the schedule does not have', () => {
    const mentioned = OAHU_TOWNS_KO.filter((town) => text.includes(town));
    expect(new Set(mentioned)).toEqual(new Set(allTowns().map(koreanName)));
  });

  it('meta description covers every location and no other town', () => {
    for (const location of locations) {
      for (const town of location.towns) {
        expect(description).toContain(koreanName(town));
      }
    }
    const mentioned = OAHU_TOWNS_KO.filter((town) =>
      description.includes(town)
    );
    expect(new Set(mentioned)).toEqual(new Set(allTowns().map(koreanName)));
  });

  it('mentions no lesson day that the schedule does not have', () => {
    const days = new Set([...text.matchAll(koDayPattern)].map((m) => m[1]));
    expect(days).toEqual(
      new Set(
        locations.flatMap((location) => location.days.map(copy.ko.dayName))
      )
    );
  });
});
