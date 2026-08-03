import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isLegacyFeatureProgressLab,
  resolvePersistedFeatureCompletion,
} from '../../app/lib/feature-access';

const OS_LAB_ID = '11111111-1111-4111-8111-111111111111';

test('an empty OS Lab progress row preserves legacy unlocks after session refresh', () => {
  const legacyCompletedAt = '2026-07-01T00:00:00.000Z';

  expect(
    resolvePersistedFeatureCompletion(null, legacyCompletedAt, true),
  ).toBe(legacyCompletedAt);
});

test('tenant labs never inherit OS Lab legacy unlocks', () => {
  expect(
    resolvePersistedFeatureCompletion(
      null,
      '2026-07-01T00:00:00.000Z',
      false,
    ),
  ).toBeNull();
});

test('only OS Lab can read or write legacy feature progress', () => {
  expect(isLegacyFeatureProgressLab(OS_LAB_ID, OS_LAB_ID)).toBe(true);
  expect(
    isLegacyFeatureProgressLab(
      '22222222-2222-4222-8222-222222222222',
      OS_LAB_ID,
    ),
  ).toBe(false);
});

test('per-lab progress remains authoritative when it is present', () => {
  expect(
    resolvePersistedFeatureCompletion(
      '2026-08-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
      true,
    ),
  ).toBe('2026-08-01T00:00:00.000Z');
});

test('browser and proxy access checks share the persisted progress fallback', () => {
  const browserAuth = readFileSync(
    resolve(process.cwd(), 'app/lib/auth.ts'),
    'utf8',
  );
  const proxyAuth = readFileSync(
    resolve(process.cwd(), 'app/lib/supabase/proxy.ts'),
    'utf8',
  );

  expect(browserAuth).toContain('resolvePersistedFeatureCompletion(');
  expect(proxyAuth).toContain('resolvePersistedFeatureCompletion(');
  expect(browserAuth).toContain('isLegacyFeatureProgressLab(');
  expect(proxyAuth).toContain('isLegacyFeatureProgressLab(');
});

test('chapter completion syncs global legacy metadata only behind the OS Lab guard', () => {
  const browserAuth = readFileSync(
    resolve(process.cwd(), 'app/lib/auth.ts'),
    'utf8',
  );
  const legacySyncGuards = browserAuth.match(
    /if \(isLegacyFeatureProgressLab\(activeLabId, DEFAULT_OS_LAB_ID\)\)/g,
  );

  expect(legacySyncGuards).toHaveLength(2);
  expect(
    browserAuth.match(/currentUserCache\.labId === activeLabId/g)?.length,
  ).toBeGreaterThanOrEqual(4);
});

test('OS Lab migration permanently backfills empty per-lab completion fields', () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      'supabase/migrations/20260813000000_backfill_os_lab_legacy_progress.sql',
    ),
    'utf8',
  );

  expect(migration).toContain(
    `where progress.lab_id = '${OS_LAB_ID}'::uuid`,
  );
  expect(migration).toContain('profile.onboarding_completed_at');
  expect(migration).toContain('labquest_chapter2_completed_at');
  expect(migration).toContain('labquest_chapter3_completed_at');
});
