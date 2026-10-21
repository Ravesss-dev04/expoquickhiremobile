import { expertiseCategories } from '@/features/expertise/constants';

import { filterGigs, findGigById, getDiscoverableGigs } from './discovery';
import { mockGigs } from './mock-data';
import type { GigFilters } from './types';

const noFilters: GigFilters = { categoryId: null, location: null, gigType: null };

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const available = getDiscoverableGigs(mockGigs);
assert(available.length === 8, 'Only open gigs should be discoverable.');
assert(available.every((gig) => gig.status === 'OPEN'), 'Unavailable gigs must be excluded.');
assert(filterGigs(mockGigs, '  ', noFilters).length === available.length, 'Whitespace search should act as empty search.');
assert(filterGigs(mockGigs, 'GUEST WELCOME', noFilters)[0]?.id === 'qh-gig-1001', 'Title search should ignore case.');
assert(filterGigs(mockGigs, 'NORTHSTAR', noFilters)[0]?.id === 'qh-gig-1002', 'Company search should ignore case.');
assert(filterGigs(mockGigs, 'customer service', noFilters)[0]?.id === 'qh-gig-1002', 'Category label should be searchable.');
assert(filterGigs(mockGigs, 'sacramento', noFilters)[0]?.id === 'qh-gig-1005', 'Location search should ignore case.');
assert(filterGigs(mockGigs, '', { ...noFilters, categoryId: 'retail-assistant' }).length === 1, 'Category filter should match the selected expertise ID.');
assert(filterGigs(mockGigs, '', { ...noFilters, location: 'Oakland, CA' }).length === 2, 'Location filter should match the selected location.');
assert(filterGigs(mockGigs, '', { ...noFilters, gigType: 'SHORT_TERM' }).length === 3, 'Schedule filter should match the selected gig type.');
assert(
  filterGigs(mockGigs, 'oakland', { ...noFilters, categoryId: 'event-staff', gigType: 'SINGLE_SHIFT' })
    .map((gig) => gig.id)
    .join(',') === 'qh-gig-1001',
  'Search and multiple filters should apply together.',
);
assert(expertiseCategories.some((category) => category.id === 'warehouse-assistant'), 'Gig categories should align with profile expertise IDs.');
assert(findGigById(mockGigs, 'qh-gig-1001')?.title === 'Guest Welcome Team', 'Known gig IDs should resolve to their record.');
assert(findGigById(mockGigs, 'unknown-id') === undefined, 'Unknown gig IDs should not resolve to another record.');

console.log('gig discovery tests passed');