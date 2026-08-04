CREATE TABLE `travel_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`confirmed_by_email` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`confirmed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
