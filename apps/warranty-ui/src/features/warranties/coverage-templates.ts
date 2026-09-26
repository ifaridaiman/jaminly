import type { Category } from '@/lib/api';

/** Typical manufacturer cover per category. A starting point the user edits, not legal advice. */
export const COVERAGE_TEMPLATES: Record<Category, { covered: string[]; notCovered: string[] }> = {
  electronics: { covered: ['Parts', 'Labour'], notCovered: ['Accidental damage', 'Water damage'] },
  appliance: { covered: ['Parts', 'Labour', 'Compressor / motor'], notCovered: ['Misuse', 'Commercial use'] },
  furniture: { covered: ['Manufacturing defects'], notCovered: ['Wear and tear', 'Stains'] },
  vehicle: { covered: ['Engine', 'Transmission'], notCovered: ['Wear parts', 'Accident damage'] },
  other: { covered: ['Manufacturing defects'], notCovered: ['Accidental damage'] },
};
