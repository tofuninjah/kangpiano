// Enforces src/data/lessons.ts and src/data/about.ts as the source of the
// Lessons and About copy: the page shows exactly what the data holds, in
// order, nothing missing and nothing extra.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import About from '../src/components/About.astro';
import Lessons from '../src/components/Lessons.astro';
import { about } from '../src/data/about';
import { lessons } from '../src/data/lessons';

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

function all(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => textOf(match[1]!));
}

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('lessons section', () => {
  it('lists exactly the data’s lessons, in order', async () => {
    const html = await container.renderToString(Lessons);
    expect(all(html, /<h3[^>]*>([\s\S]*?)<\/h3>/g)).toEqual(
      lessons.map((lesson) => lesson.title)
    );
    expect(
      all(html, /<h3[^>]*>[\s\S]*?<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)
    ).toEqual(lessons.map((lesson) => lesson.detail));
  });

  it('numbers the lessons 01, 02, … to match', async () => {
    const html = await container.renderToString(Lessons);
    const numbers = all(
      html,
      /<span aria-hidden="true"[^>]*>([\s\S]*?)<\/span>/g
    );
    expect(numbers).toEqual(
      lessons.map((_, index) => String(index + 1).padStart(2, '0'))
    );
  });
});

describe('about section', () => {
  it('shows the quote and bio from the data', async () => {
    const text = textOf(await container.renderToString(About));
    expect(text).toContain(`“${about.quote.lead} ${about.quote.emphasis}”`);
    expect(text).toContain(about.bio);
  });

  it('puts exactly the data’s paragraphs behind "Why learn piano?"', async () => {
    const html = await container.renderToString(About);
    const block = html.match(/data-why-piano[^>]*>([\s\S]*?)<\/div>/)![1]!;
    expect(all(block, /<p>([\s\S]*?)<\/p>/g)).toEqual([...about.whyPiano]);
  });
});
