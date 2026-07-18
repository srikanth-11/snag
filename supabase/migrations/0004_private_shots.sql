-- Screenshots can capture authenticated hunts (a user testing their own app
-- behind a login), so the bucket must not be world-readable. Make it private;
-- the app serves screenshots through short-lived signed URLs generated
-- server-side (see src/lib/storage.ts signShot).
update storage.buckets set public = false where id = 'shots';
