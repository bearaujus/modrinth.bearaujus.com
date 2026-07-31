import type { Mod } from '../data/mods';
import {
  CATALOG_REVIEWED_AT,
  FABRIC_API_MIN_VERSION,
  LOADER_MIN_VERSION,
  MC_RANGE,
  MODRINTH_USER,
  SUPPORT_URL,
  localModUrl,
  modrinthProjectUrl,
  modrinthVersionUrl,
} from '../data/mods';
import type { Stat } from './modrinth';

export function personSchema(site: string) {
  return {
    '@type': 'Person',
    '@id': `${site}/#person`,
    name: 'Haryo Bagas Assyafah',
    alternateName: 'bearaujus',
    url: `${site}/`,
    jobTitle: 'Software Engineer',
    sameAs: [MODRINTH_USER, 'https://github.com/bearaujus'],
  };
}

export function softwareSchema(mod: Mod, stat: Stat, site: string) {
  const localUrl = `${site}${localModUrl(mod)}`;
  const keywords = [
    ...mod.discoveryQueries,
    ...mod.categories,
    ...mod.additionalCategories,
    'Minecraft Fabric mod',
    'server-side Minecraft mod',
  ];

  return {
    '@type': 'SoftwareApplication',
    '@id': `${localUrl}#software`,
    name: mod.name,
    description: mod.summary,
    url: localUrl,
    sameAs: modrinthProjectUrl(mod),
    downloadUrl: modrinthVersionUrl(mod),
    image: `${site}/mods/${mod.slug}/icon.png`,
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'Minecraft Fabric mod',
    softwareVersion: mod.releaseVersion,
    operatingSystem: 'Any platform supporting Minecraft: Java Edition',
    softwareRequirements: `${MC_RANGE}; Fabric Loader >=${LOADER_MIN_VERSION}; Fabric API >=${FABRIC_API_MIN_VERSION}`,
    featureList: mod.bullets,
    keywords: [...new Set(keywords)].join(', '),
    dateModified: CATALOG_REVIEWED_AT,
    author: { '@id': `${site}/#person` },
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/DownloadAction',
      userInteractionCount: stat.downloads,
    },
    softwareHelp: SUPPORT_URL,
  };
}
