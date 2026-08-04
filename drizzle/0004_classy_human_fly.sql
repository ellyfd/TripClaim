CREATE TABLE `agenda_items` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`timezone` text,
	`place` text,
	`address` text,
	`reference_url` text,
	`notes` text,
	`created_by_email` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text,
	`actor_email` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`city_code` text,
	`city_name` text NOT NULL,
	`timezone` text,
	`sequence` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`flow` text NOT NULL,
	`step` integer DEFAULT 1 NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`user_email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`purpose` text,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`created_by_email` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
