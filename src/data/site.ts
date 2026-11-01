// Shared business details, in English. The phone number and towns live here
// and in the schedule (src/data/schedule.ts) only; the English and Korean
// copy (src/data/copy) and the structured data read them from here.
import { allTowns, teachingSummary } from '../lib/schedule';
import type { NavSection } from './copy/types';

const firstName = 'Hyejeong';

export const site = {
  name: `${firstName} Kang`,
  instruments: 'Piano & Violin',
  title: `${firstName} Kang Piano & Violin`,
  description: `Private piano and violin lessons on Oʻahu, ${teachingSummary(firstName)}.`,
  phone: {
    display: '(808) 371-0708',
    href: 'tel:+18083710708',
  },
  towns: allTowns(),
  // Home-page sections, in nav order, shared by the desktop nav and the
  // mobile menu. Their labels are in the copy. The header links each one on
  // the home page of the visitor's language (homeSectionHref), so they also
  // work from the form result pages.
  navSections: [
    'schedule',
    'lessons',
    'about',
    'contact',
  ] satisfies readonly NavSection[],
} as const;
