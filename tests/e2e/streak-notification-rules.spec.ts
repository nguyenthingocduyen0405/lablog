import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath =
  'supabase/migrations/20260814000000_streak_notification_rules.sql';

function loadMigration() {
  return readFileSync(resolve(process.cwd(), migrationPath), 'utf8');
}

test('streak reminders require a work entry from the previous Seoul day', () => {
  const migration = loadMigration();

  expect(migration.match(/= reminder_day - 1/g)).toHaveLength(2);
  expect(migration).toContain(
    '= notification.reminder_date - 1',
  );
  expect(migration).not.toContain('from public.profiles as profile');
});

test('invalid streak reminders for members without a streak are removed', () => {
  const migration = loadMigration();

  expect(migration).toContain(
    `delete from public.notifications as notification`,
  );
  expect(migration).toContain(
    `where notification.type = 'streak_reminder'`,
  );
  expect(migration).toContain('post.post_kind = \'work\'');
});

test('members without any work record receive a first-record prompt instead', () => {
  const migration = loadMigration();
  const bell = readFileSync(
    resolve(process.cwd(), 'app/components/notifications-bell.tsx'),
    'utf8',
  );

  expect(migration).toContain(`'first_record_reminder'`);
  expect(migration).toContain(
    'notifications_daily_first_record_reminder_idx',
  );
  expect(migration).toMatch(
    /and not exists \(\s*select 1\s*from public\.posts as post\s*where post\.lab_id = membership\.lab_id\s*and post\.user_id = membership\.user_id\s*and post\.post_kind = 'work'/,
  );
  expect(bell).toMatch(/item\.type === \x22first_record_reminder\x22/);
  expect(bell).toContain('오늘 첫 기록을 남겨보세요');
  expect(bell).toContain('Hãy để lại ghi chép đầu tiên hôm nay');
  expect(bell).not.toContain('Hãy để lại 기록 đầu tiên hôm nay');
});

test('creating a work record refreshes the notification bell immediately', () => {
  const social = readFileSync(
    resolve(process.cwd(), 'app/lib/lab-social.ts'),
    'utf8',
  );
  const bell = readFileSync(
    resolve(process.cwd(), 'app/components/notifications-bell.tsx'),
    'utf8',
  );

  expect(social).toContain('notificationsCache.delete(memberId)');
  expect(social).toMatch(
    /kind !== \x22moment\x22[\s\S]*window\.dispatchEvent\(new Event\(\x22lab-notifications-changed\x22\)\)/,
  );
  expect(bell).toMatch(
    /window\.addEventListener\([\s\S]*\x22lab-notifications-changed\x22[\s\S]*handleNotificationsChanged/,
  );
  expect(bell).toMatch(
    /window\.removeEventListener\([\s\S]*\x22lab-notifications-changed\x22[\s\S]*handleNotificationsChanged/,
  );
});

test('daily reminders are isolated by lab', () => {
  const migration = loadMigration();

  expect(migration).toContain(
    'on public.notifications (lab_id, recipient_id, reminder_date)',
  );
  expect(migration).toContain(
    'on conflict (lab_id, recipient_id, reminder_date)',
  );
  expect(migration).toContain('post.lab_id = membership.lab_id');
  expect(migration).toContain('notification.lab_id = new.lab_id');
});

test('mission reminders remain available alongside streak reminders', () => {
  const migration = loadMigration();
  const bell = readFileSync(
    resolve(process.cwd(), 'app/components/notifications-bell.tsx'),
    'utf8',
  );

  expect(migration).toContain(`'mission_reminder'`);
  expect(migration).toContain(`'first_record_reminder'`);
  expect(migration).toContain(`'streak_reminder'`);
  expect(bell).toMatch(/item\.type === \x22mission_reminder\x22/);
  expect(bell).toMatch(/item\.type === \x22streak_reminder\x22/);
  expect(bell).toMatch(/item\.type === \x22team_project_invite\x22/);
});
