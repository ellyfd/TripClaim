ALTER TABLE `personal_expenses` ADD `category_code` text;--> statement-breakpoint
CREATE TABLE `master_data_exceptions` (
 `id` text PRIMARY KEY NOT NULL, `trip_id` text, `owner_email` text NOT NULL,
 `source_type` text NOT NULL, `source_id` text, `field_name` text NOT NULL,
 `raw_value` text NOT NULL, `master_data_version` text NOT NULL,
 `status` text DEFAULT 'open' NOT NULL, `created_at` text NOT NULL, `resolved_at` text
);
