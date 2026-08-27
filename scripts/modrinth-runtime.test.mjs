import assert from 'node:assert/strict';
import test from 'node:test';

import {
  environmentCopy,
  normalizeProject,
  normalizeRelease,
  selectLatestStableRelease,
} from '../src/scripts/modrinth-runtime.ts';

const PROJECT_ID = 'A1b2C3d4';

test('normalizes only requested project data and allowlisted icon URLs', () => {
  const knownIds = new Set([PROJECT_ID]);
  const project = normalizeProject(
    {
      id: PROJECT_ID,
      slug: 'example-project',
      title: 'Example Project',
      description: 'A concise project description.',
      categories: ['utility', 'fabric'],
      additional_categories: ['utility', 'management'],
      raw_icon_url: 'javascript:alert(1)',
      icon_url: 'https://cdn.modrinth.com/data/A1b2C3d4/icon.webp',
      downloads: 1200,
      followers: 42,
      versions: ['Z9y8X7w6', 'invalid'],
    },
    knownIds,
  );

  assert.ok(project);
  assert.equal(project.iconUrl, 'https://cdn.modrinth.com/data/A1b2C3d4/icon.webp');
  assert.deepEqual(project.categories, ['utility', 'fabric', 'management']);
  assert.deepEqual(project.versionIds, ['Z9y8X7w6']);
  assert.equal(
    normalizeProject({ id: 'Q1w2E3r4' }, knownIds),
    null,
    'unexpected project IDs must be ignored',
  );
});

test('keeps invalid metrics nullable so individual static fields can survive', () => {
  const project = normalizeProject({
    id: PROJECT_ID,
    slug: 'example-project',
    title: 'Example Project',
    description: 'A concise project description.',
    categories: [],
    additional_categories: [],
    downloads: -1,
    followers: 'many',
    versions: [],
  });

  assert.ok(project);
  assert.equal(project.downloads, null);
  assert.equal(project.followers, null);
});

function release(overrides = {}) {
  return normalizeRelease({
    id: 'R1e2L3s4',
    project_id: PROJECT_ID,
    version_number: '1.0.0',
    date_published: '2026-01-01T00:00:00Z',
    version_type: 'release',
    status: 'listed',
    game_versions: ['26.2'],
    loaders: ['fabric'],
    environment: 'server_only_client_optional',
    ...overrides,
  });
}

test('selects the newest listed stable Fabric release', () => {
  const candidates = [
    release(),
    release({ id: 'N1e2W3r4', version_number: '1.1.0', date_published: '2026-02-01T00:00:00Z' }),
    release({ id: 'B1e2T3a4', version_number: '2.0.0-beta', version_type: 'beta', date_published: '2026-04-01T00:00:00Z' }),
    release({ id: 'F1o2R3g4', version_number: '2.0.0', loaders: ['forge'], date_published: '2026-05-01T00:00:00Z' }),
    release({ id: 'A1r2C3h4', version_number: '1.2.0', status: 'archived', date_published: '2026-03-01T00:00:00Z' }),
  ].filter(Boolean);

  assert.equal(selectLatestStableRelease(PROJECT_ID, candidates)?.versionNumber, '1.1.0');
});

test('maps current and unknown installation environments to useful copy', () => {
  assert.equal(environmentCopy('server_only_client_optional').short, 'Server-first');
  assert.equal(environmentCopy('future_environment').short, 'See release');
});
