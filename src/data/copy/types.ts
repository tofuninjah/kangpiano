// Every visitor-facing string on the home page and in the layout every page
// shares. One file per language fills it in (en.ts, ko.ts); TypeScript
// rejects either file if it leaves a string out or adds one the type
// doesn't have. Facts (towns, days, phone) stay in schedule.ts and site.ts;
// these files only say them.
import type { Day, Location } from '../schedule';

/** A heading whose last words are set in italics. */
export interface Emphasized {
  lead: string;
  emphasis: string;
}

export interface Lesson {
  title: string;
  detail: string;
}

/** One block behind "Why learn piano?": an optional bold lead-in, then text. */
export interface WhyPoint {
  lead?: string;
  text: string;
}

/** Home-page sections the nav links to, by their element id. */
export type NavSection = 'schedule' | 'lessons' | 'about' | 'contact';

export interface PageCopy {
  meta: {
    /** <title> and og:title of the home page. */
    title: string;
    /** og:site_name on every page. */
    siteName: string;
    description: string;
  };
  skipLink: string;
  /** Wordmark in the header and footer. */
  name: string;
  instruments: string;
  /** Call button text with the number, as in "Call (808) 371-0708". */
  callNumber: (phone: string) => string;
  /** A town from the schedule data, as this language writes it. */
  townName: (town: string) => string;
  dayName: (day: Day) => string;
  header: {
    navLabel: string;
    nav: Record<NavSection, string>;
    menu: string;
    closeMenu: string;
  };
  hero: {
    eyebrow: string;
    heading: Emphasized;
    /** Where she teaches, built from the schedule. */
    teachingSentence: string;
    requestLink: string;
    imageAlt: string;
  };
  credentials: readonly { title: string; detail: string }[];
  schedule: {
    eyebrow: string;
    heading: Emphasized;
    note: string;
    daysLabel: string;
    locationTitle: (host: Location['host']) => string;
    /** A town as the schedule section shows it. */
    townLabel: (town: string) => TownLabel;
  };
  lessons: {
    eyebrow: string;
    heading: Emphasized;
    intro: string;
    items: readonly Lesson[];
  };
  about: {
    heading: string;
    quote: Emphasized;
    bio: string;
    portraitAlt: string;
    whyTitle: string;
    why: readonly WhyPoint[];
  };
  callBar: {
    callNow: string;
    /** Accessible name of the call link, with the number. */
    callNowLabel: (phone: string) => string;
    request: string;
  };
  /**
   * The lesson request form. Status and error messages live in
   * src/lib/contact.ts, which the form's browser script bundles.
   */
  contact: {
    eyebrow: string;
    heading: Emphasized;
    intro: string;
    callLabel: string;
    name: string;
    contact: string;
    age: string;
    ageHint: string;
    town: string;
    townPlaceholder: string;
    /** Label for the "Somewhere else" town option; its value stays English. */
    otherTown: string;
    message: string;
    /** Shown in brackets after an optional field's label. */
    optional: string;
    honeypot: string;
    submit: string;
    privacyNote: string;
  };
  /** Pages a no-JavaScript form post lands on. */
  formResult: Record<'sent' | 'notSent', ResultCopy> & { back: string };
}

/** A town name as shown, with the English name beside it when translated. */
export interface TownLabel {
  name: string;
  /** Shown in brackets after the name, marked lang="en". */
  english?: string;
}

export interface ResultCopy {
  title: string;
  eyebrow: string;
  heading: string;
  body: string;
}
