CREATE TABLE `system_users` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
