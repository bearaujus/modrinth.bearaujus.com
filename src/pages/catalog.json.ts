import {
  CATALOG_REVIEWED_AT,
  FABRIC_API_MIN_VERSION,
  LOADER,
  LOADER_MIN_VERSION,
  MC_RANGE,
  MC_SERIES,
  MC_VERSION,
  MODS,
  SITE_URL,
  SUPPORT_URL,
  localModUrl,
  modrinthProjectUrl,
  modrinthVersionUrl,
} from '../data/mods';

export function GET() {
  const payload = {
    schemaVersion: 1,
    reviewedAt: CATALOG_REVIEWED_AT,
    website: SITE_URL,
    support: SUPPORT_URL,
    compatibility: {
      minecraft: MC_VERSION,
      series: MC_SERIES,
      range: MC_RANGE,
      loader: LOADER,
      loaderMinimum: LOADER_MIN_VERSION,
      fabricApiMinimum: FABRIC_API_MIN_VERSION,
    },
    mods: MODS.map((mod) => ({
      id: mod.id,
      name: mod.name,
      slug: mod.slug,
      summary: mod.summary,
      version: mod.releaseVersion,
      projectId: mod.modrinthId,
      versionId: mod.modrinthVersionId,
      page: `${SITE_URL}${localModUrl(mod)}`,
      project: modrinthProjectUrl(mod),
      release: modrinthVersionUrl(mod),
      icon: `${SITE_URL}/mods/${mod.slug}/icon.png`,
      categories: mod.categories,
      additionalCategories: mod.additionalCategories,
      discoveryQueries: mod.discoveryQueries,
      environment: mod.env,
      features: mod.bullets,
    })),
  };

  return new Response(`${JSON.stringify(payload, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
