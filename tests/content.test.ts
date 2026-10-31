// Enforces each language's copy file (src/data/copy) as the source of the
// Credentials, Lessons and About text: each page shows exactly what its copy
// holds, in order, nothing missing and nothing extra.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import About from '../src/components/About.astro';
import Credentials from '../src/components/Credentials.astro';
import Lessons from '../src/components/Lessons.astro';
import { copy } from '../src/data/copy';
import { LOCALES } from '../src/lib/i18n';

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

for (const locale of LOCALES) {
  const text = copy[locale];
  const props = { props: { locale } };

  describe(`credentials (${locale})`, () => {
    it('lists exactly the copy’s credentials, in order', async () => {
      const html = await container.renderToString(Credentials, props);
      expect(all(html, /<li[^>]*>([\s\S]*?)<\/li>/g)).toEqual(
        text.credentials.map((item) => `${item.title} ${item.detail}`)
      );
    });
  });

  describe(`lessons section (${locale})`, () => {
    it('lists exactly the copy’s lessons, in order', async () => {
      const html = await container.renderToString(Lessons, props);
      expect(all(html, /<h3[^>]*>([\s\S]*?)<\/h3>/g)).toEqual(
        text.lessons.items.map((lesson) => lesson.title)
      );
      expect(
        all(html, /<h3[^>]*>[\s\S]*?<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)
      ).toEqual(text.lessons.items.map((lesson) => lesson.detail));
    });

    it('numbers the lessons 01, 02, … to match', async () => {
      const html = await container.renderToString(Lessons, props);
      const numbers = all(
        html,
        /<span aria-hidden="true"[^>]*>([\s\S]*?)<\/span>/g
      );
      expect(numbers).toEqual(
        text.lessons.items.map((_, index) => String(index + 1).padStart(2, '0'))
      );
    });
  });

  describe(`about section (${locale})`, () => {
    it('shows the quote and bio from the copy', async () => {
      const page = textOf(await container.renderToString(About, props));
      const { quote, bio } = text.about;
      expect(page).toContain(`“${quote.lead} ${quote.emphasis}”`);
      expect(page).toContain(bio);
    });

    it('puts exactly the copy’s paragraphs behind its "Why learn piano?"', async () => {
      const html = await container.renderToString(About, props);
      expect(textOf(html)).toContain(text.about.whyTitle);
      const block = html.match(/data-why-piano[^>]*>([\s\S]*?)<\/div>/)![1]!;
      expect(all(block, /<p>([\s\S]*?)<\/p>/g)).toEqual(
        text.about.why.map((point) =>
          point.lead ? `${point.lead} ${point.text}` : point.text
        )
      );
    });
  });
}
