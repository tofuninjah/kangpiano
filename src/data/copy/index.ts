import type { Locale } from '../../lib/i18n';
import { en } from './en';
import { ko } from './ko';
import type { PageCopy } from './types';

/** Each language's copy; components read copy[locale]. */
export const copy: Record<Locale, PageCopy> = { en, ko };
