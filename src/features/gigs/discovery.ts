import { expertiseCategories } from '@/features/expertise/constants';

import { mockGigs } from './mock-data';
import type { Gig, GigFilters } from './types';

export const emptyGigFilters: GigFilters = {
  categoryId: null,
  location: null,
  gigType: null,
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function getDiscoverableGigs(gigs: readonly Gig[] = mockGigs) {
  return gigs.filter((gig) => gig.status === 'OPEN');
}

export function filterGigs(
  gigs: readonly Gig[],
  query: string,
  filters: GigFilters,
) {
  const normalizedQuery = normalize(query);
  const categoryById = new Map(expertiseCategories.map((category) => [category.id, category.label]));

  return getDiscoverableGigs(gigs).filter((gig) => {
    const categoryLabel = categoryById.get(gig.categoryId) ?? gig.categoryId;
    const matchesQuery =
      !normalizedQuery ||
      [gig.title, gig.companyName, categoryLabel, gig.location].some((value) =>
        normalize(value).includes(normalizedQuery),
      );

    return (
      matchesQuery &&
      (!filters.categoryId || gig.categoryId === filters.categoryId) &&
      (!filters.location || gig.location === filters.location) &&
      (!filters.gigType || gig.gigType === filters.gigType)
    );
  });
}

export function findGigById(gigs: readonly Gig[], gigId: string | undefined) {
  if (!gigId) return undefined;
  return gigs.find((gig) => gig.id === gigId);
}