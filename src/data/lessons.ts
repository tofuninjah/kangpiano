// Who lessons are for, condensed from the 15 bullets on the 2016 site.
// tests/content.test.ts checks the page renders exactly this list.
import { formatList } from '../lib/format';
import { locations } from './schedule';

export interface Lesson {
  title: string;
  detail: string;
}

export const lessonsIntro =
  'Private, one-on-one, and paced to you — whether you’re just starting out or coming back after years away.';

// In-home lessons only happen in some towns, so that item names them from
// the schedule rather than promising a home visit everywhere.
const inHomeTowns = locations
  .filter((location) => location.host === 'student')
  .flatMap((location) => location.towns);

export const lessons: readonly Lesson[] = [
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
  ...(inHomeTowns.length > 0
    ? [
        {
          title: 'In the privacy of your own home',
          detail: `In ${formatList(inHomeTowns)}, on your own piano, with nowhere to drive.`,
        },
      ]
    : []),
];
