CREATE TABLE `personal_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`trip_id` text NOT NULL,
	`source_document_id` text,
	`category` text NOT NULL,
	`merchant` text NOT NULL,
	`expense_date` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`card_last4` text,
	`status` text DEFAULT 'review' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `travel_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`trip_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`traveler_name` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`amount_minor` integer,
	`currency` text,
	`card_last4` text,
	`share_summary` integer DEFAULT true NOT NULL,
	`create_expense` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
