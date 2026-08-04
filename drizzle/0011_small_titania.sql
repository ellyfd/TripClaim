CREATE TABLE `trip_member_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`user_email` text NOT NULL,
	`item_key` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
