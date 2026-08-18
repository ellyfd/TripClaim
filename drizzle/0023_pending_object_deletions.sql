CREATE TABLE IF NOT EXISTS `pending_object_deletions` (
  `id` text PRIMARY KEY NOT NULL,
  `owner_email` text NOT NULL,
  `trip_id` text NOT NULL,
  `object_key` text NOT NULL UNIQUE,
  `source_type` text NOT NULL,
  `source_id` text,
  `attempts` integer NOT NULL DEFAULT 0,
  `last_error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `pending_object_deletions_owner_trip_idx`
ON `pending_object_deletions` (`owner_email`, `trip_id`);
