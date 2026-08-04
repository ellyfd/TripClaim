CREATE TABLE `travel_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`timezone` text,
	`origin` text,
	`destination` text,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`booked_at` text NOT NULL,
	`document_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `source_booking_id` text;