/**
 * FHIR Bundle Builder — construct transaction, searchset, and document bundles
 */

import type { FhirBundle, FhirBundleEntry, FhirResource } from '@/types/fhir';

/**
 * Build a FHIR transaction Bundle from a list of resources.
 * Each resource gets a PUT request entry.
 */
export function buildTransactionBundle(resources: FhirResource[]): FhirBundle {
  const entries: FhirBundleEntry[] = resources.map((resource) => ({
    fullUrl: resource.id
      ? `urn:uuid:${resource.resourceType}/${resource.id}`
      : undefined,
    resource,
    request: {
      method: resource.id ? 'PUT' as const : 'POST' as const,
      url: resource.id
        ? `${resource.resourceType}/${resource.id}`
        : resource.resourceType,
    },
  }));

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

/**
 * Build a FHIR searchset Bundle (for search results).
 */
export function buildSearchsetBundle(
  resources: FhirResource[],
  total?: number,
): FhirBundle {
  const entries: FhirBundleEntry[] = resources.map((resource) => ({
    fullUrl: resource.id
      ? `${resource.resourceType}/${resource.id}`
      : undefined,
    resource,
  }));

  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: total ?? resources.length,
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

/**
 * Build a FHIR document Bundle (for complete patient export).
 */
export function buildDocumentBundle(resources: FhirResource[]): FhirBundle {
  const entries: FhirBundleEntry[] = resources.map((resource) => ({
    fullUrl: resource.id
      ? `${resource.resourceType}/${resource.id}`
      : undefined,
    resource,
  }));

  return {
    resourceType: 'Bundle',
    type: 'document',
    total: resources.length,
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

/**
 * Extract resources of a specific type from a Bundle.
 */
export function extractFromBundle<T extends FhirResource>(
  bundle: FhirBundle,
  resourceType: string,
): T[] {
  if (!bundle.entry) return [];
  return bundle.entry
    .filter((entry) => entry.resource?.resourceType === resourceType)
    .map((entry) => entry.resource as T);
}
