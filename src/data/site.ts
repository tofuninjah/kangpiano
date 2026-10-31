// Shared business details. Header, footer, call bar and meta tags read from
// here so the phone number and towns live in one place. Towns and the
// description come from the schedule (src/data/schedule.ts).
import { allTowns, teachingSummary } from '../lib/schedule';

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
  // Home-page sections, shared by the desktop nav and the mobile menu.
  // Rooted at / so they also work from the form result pages.
  nav: [
    { label: 'Where & when', href: '/#schedule' },
    { label: 'Lessons', href: '/#lessons' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/#contact' },
  ],
} as const;
