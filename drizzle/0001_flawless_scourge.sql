CREATE TABLE `uploaded_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`trip_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`document_type` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uploaded_documents_object_key_unique` ON `uploaded_documents` (`object_key`);