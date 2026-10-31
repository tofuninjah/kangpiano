// Facts read from the schedule, plus the English sentences built from it.
// The Korean sentences live in src/data/copy/ko.ts, since Korean word order
// and particles need their own builders.
import { locations } from '../data/schedule';
import { formatList, joinClauses } from './format';

/** Every town taught in, in schedule order, without repeats. */
export function allTowns(): string[] {
  return [...new Set(locations.flatMap((location) => location.towns))];
}

/** Towns where she teaches in the student's home. */
export function inHomeTowns(): string[] {
  return locations
    .filter((location) => location.host === 'student')
    .flatMap((location) => location.towns);
}

/** English hero copy, in Hyejeong's voice. */
export function teachingSentence(): string {
  const clauses = locations.map((location) => {
    const place = location.host === 'student' ? 'your home' : 'my home';
    return `at ${place} in ${formatList(location.towns)}`;
  });
  return `I teach ${joinClauses(clauses, 'and')}.`;
}

/** Third-person summary for meta tags. */
export function teachingSummary(teacher: string): string {
  const clauses = locations.map((location) => {
    const place =
      location.host === 'student' ? 'your home' : `${teacher}’s home`;
    return `at ${place} in ${formatList(location.towns)}`;
  });
  return joinClauses(clauses, 'or');
}
