CREATE TABLE `trip_comp_leave_overrides` (
  `id` text PRIMARY KEY NOT NULL,
  `trip_id` text NOT NULL,
  `user_email` text NOT NULL,
  `half_units` integer NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trip_comp_leave_overrides_trip_user_unique` ON `trip_comp_leave_overrides` (`trip_id`,`user_email`);
