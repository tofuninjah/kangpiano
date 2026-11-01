// English copy. Lessons are condensed from the 15 bullets on the 2016 site.
// The "Why learn piano?" paragraphs are the 2016 site's "reasons to play"
// text with typos fixed and US spelling; the paragraph on test scores and
// Alberta high-school credits was dropped as unsourced and not relevant to
// Hawaiʻi.
import { OTHER_TOWN } from '../../lib/contact';
import { formatList } from '../../lib/format';
import { inHomeTowns, teachingSentence } from '../../lib/schedule';
import { site } from '../site';
import type { Lesson, PageCopy } from './types';

const homeTowns = inHomeTowns();

const lessons: readonly Lesson[] = [
  {
    title: 'Trying piano for the first time',
    detail: 'No experience or instrument know-how needed.',
  },
  {
    title: 'Coming back to it',
    detail: 'Review what you learned years ago and pick up where you left off.',
  },
  {
    title: 'Extra support alongside a current teacher',
    detail: 'Focused help between your regular lessons.',
  },
  {
    title: 'Reading, rhythm and theory',
    detail:
      'Notes on the keyboard, rhythmic patterns and the basics of music theory.',
  },
  {
    title: 'Busy schedules, your own pace',
    detail: 'Learn at the rate that fits your life, not a fixed curriculum.',
  },
  // In-home lessons only happen in some towns, so this item names them from
  // the schedule rather than promising a home visit everywhere.
  ...(homeTowns.length > 0
    ? [
        {
          title: 'In the privacy of your own home',
          detail: `In ${formatList(homeTowns)}, on your own piano, with nowhere to drive.`,
        },
      ]
    : []),
  {
    title: 'In English or Korean',
    detail:
      'Learn in whichever language is easier for the student, and talk with me in Korean if you prefer.',
  },
];

export const en = {
  meta: {
    title: site.title,
    siteName: site.title,
    description: site.description,
  },
  skipLink: 'Skip to content',
  name: site.name,
  instruments: site.instruments,
  callNumber: (phone) => `Call ${phone}`,
  townName: (town) => town,
  dayName: (day) => day,
  header: {
    navLabel: 'Main',
    nav: {
      schedule: 'Where & when',
      lessons: 'Lessons',
      about: 'About',
      contact: 'Contact',
    },
    menu: 'Menu',
    closeMenu: 'Close menu',
  },
  hero: {
    eyebrow: 'Private lessons · Oʻahu · All ages',
    heading: {
      lead: 'Piano lessons in your living room,',
      emphasis: 'or mine.',
    },
    teachingSentence: teachingSentence(),
    requestLink: 'Request a first lesson',
    imageAlt: 'Hands playing a piano keyboard in warm light.',
  },
  credentials: [
    { title: 'Mokwon University', detail: 'Music graduate, Daejeon, Korea' },
    { title: 'Hawaiʻi & Korea', detail: 'Many years of teaching in both' },
    { title: 'Every age & level', detail: 'First-timers to returning adults' },
  ],
  schedule: {
    eyebrow: 'The weekly program',
    heading: { lead: 'Where I teach,', emphasis: 'and when.' },
    note: 'Lessons are by appointment. Call to find a time that fits your family’s week.',
    daysLabel: 'Lesson days',
    locationTitle: (host) =>
      host === 'student' ? 'At your home' : 'At my home',
    townLabel: (town) => ({ name: town }),
  },
  lessons: {
    eyebrow: 'Lessons',
    heading: { lead: 'Lessons shaped around', emphasis: 'the student.' },
    intro:
      'Private, one-on-one, and paced to you — whether you’re just starting out or coming back after years away.',
    items: lessons,
  },
  about: {
    heading: 'About Hyejeong',
    quote: {
      lead: 'The piano is always there,',
      emphasis: 'ready for you to pour out your soul.',
    },
    bio: 'Hyejeong studied music at Mokwon University and has taught private piano and violin lessons in Hawaiʻi and Korea for many years. She believes playing sharpens the mind, steadies the hands, and gives every student a lifelong place to set down the day.',
    // Used once a portrait is added at src/assets/images/portrait.(jpg|png|webp).
    portraitAlt: 'Hyejeong Kang at the piano',
    whyTitle: 'Why learn piano?',
    why: [
      {
        text: 'There are many and varied reasons to play the piano. It is a beautiful instrument with a beautiful look and a beautiful sound. It can be a soloist’s instrument or a group instrument. It sharpens the mind and body. The gift of music is therapeutic. There are many careers that require piano skills. The list goes on and on.',
      },
      {
        text: 'Playing the piano develops a high level of manual dexterity. While it may seem very simple to just push the keys, learning to perform complex pieces with precision and emotion needs a little time and a very human touch. That is one reason why professional pianists have not been replaced by computers. It is more complicated than patting your head while rubbing your tummy! But it is ever so much more rewarding too!',
      },
      {
        text: 'The piano is also a staple of family sing-alongs — whether you are singing Christmas carols or playing some favorite movie tunes. The very design of the piano lends itself to groups of people gathered around, singing along. This is one of the most social of activities. This is where some of our warmest and most treasured memories are made.',
      },
      {
        text: 'There are many jobs and careers for pianists. One can be the piano player in a lounge, on a cruise ship, in a church (mass, weddings, funerals), or in a band. One can be an instructor with a college or university or teach out of a home studio. One can accompany vocalists, choirs, violinists, and others as they perform for competition or for an audience. One can compose movie scores or commercial jingles or orchestral pieces. The possibilities are endless.',
      },
      {
        text: 'The ability to play a musical instrument and to express oneself with a musical instrument is very healthy and therapeutic. Stresses can melt away. The piano is always there, ready for you to pour out your soul. It is a most patient and agreeable companion. If you’re upset, go ahead and thunder away on the keyboard, and when you’re done and feeling better, go ahead and pick up a more languid or cheerful piece.',
      },
      {
        text: 'And, of course, a piano is a beautiful addition to any living room!',
      },
    ],
  },
  callBar: {
    callNow: 'Call now',
    callNowLabel: (phone) => `Call now, ${phone}`,
    request: 'Request a lesson',
  },
  contact: {
    eyebrow: 'Request a first lesson',
    heading: { lead: 'Let’s find your', emphasis: 'first lesson.' },
    intro:
      'Calling is quickest. If it’s easier, send a short note and I’ll get back to you.',
    callLabel: 'Call',
    name: 'Your name',
    contact: 'Phone or email',
    age: 'Student’s age',
    ageHint: 'For example, 7 or adult',
    town: 'Town',
    townPlaceholder: 'Choose a town',
    otherTown: OTHER_TOWN,
    message: 'Anything I should know?',
    optional: 'optional',
    honeypot: 'Leave this empty',
    submit: 'Send request',
    privacyNote: 'Used only to reply to you.',
  },
  formResult: {
    sent: {
      title: `Request sent · ${site.title}`,
      eyebrow: 'Request sent',
      heading: 'Thank you. Your request is on its way.',
      body: 'I’ll get back to you soon. If you’d rather talk now, calling is quickest.',
    },
    notSent: {
      title: `Request not sent · ${site.title}`,
      eyebrow: 'Request not sent',
      heading: 'Sorry, your request didn’t go through.',
      body: 'Please go back and check the form, or give me a call instead.',
    },
    back: 'Back to the site',
  },
} satisfies PageCopy;
