// Source of truth for where and when Hyejeong teaches. The schedule
// section, hero sentence, meta description and footer all render from this,
// and tests/schedule.test.ts fails if any of them disagree with it.

export type Day =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface Location {
  /** Whose home the lesson happens in. */
  host: 'student' | 'teacher';
  towns: readonly string[];
  days: readonly Day[];
}

export const locations: readonly Location[] = [
  {
    host: 'student',
    towns: ['ʻEwa Beach', 'Kapolei'],
    days: ['Tuesday', 'Thursday'],
  },
  { host: 'teacher', towns: ['Mililani'], days: ['Wednesday', 'Friday'] },
];
