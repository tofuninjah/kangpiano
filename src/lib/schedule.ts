import { locations, type Location } from '../data/schedule';
import { formatList, joinClauses } from './format';

/** Section heading for a location: "At your home" / "At my home". */
export function locationTitle(location: Location): string {
  return location.host === 'student' ? 'At your home' : 'At my home';
}

/** Every town taught in, in schedule order, without repeats. */
export function allTowns(): string[] {
  return [...new Set(locations.flatMap((location) => location.towns))];
}

/** Hero copy, in Hyejeong's voice. */
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
