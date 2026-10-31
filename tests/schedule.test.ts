// Enforces src/data/schedule.ts as the source of truth for where and when
// lessons happen. Each check fails in both directions: data the page leaves
// out, and anything the page shows that the data doesn't have.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Footer from '../src/components/Footer.astro';
import Hero from '../src/components/Hero.astro';
import Schedule from '../src/components/Schedule.astro';
import IndexPage from '../src/pages/index.astro';
import { locations } from '../src/data/schedule';
import { formatList } from '../src/lib/format';
import { allTowns, teachingSentence } from '../src/lib/schedule';

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

function townsIn(html: string): string[] {
  return [
    ...html.matchAll(/<span[^>]*\bdata-town\b[^>]*>([^<]*)<\/span>/g),
  ].map((match) => match[1]!.trim());
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
    const html = await container.renderToString(Schedule);
    const hosts = [...html.matchAll(/data-location="([^"]+)"/g)].map(
      (match) => match[1]
    );
    expect(hosts).toEqual(locations.map((location) => location.host));
  });

  it('shows exactly each location’s towns and days', async () => {
    const html = await container.renderToString(Schedule);
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
    const html = await container.renderToString(Hero);
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
    const html = await container.renderToString(Footer);
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
