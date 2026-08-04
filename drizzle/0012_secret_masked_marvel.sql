ALTER TABLE `uploaded_documents` ADD `extraction_confidence` integer;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `extraction_warnings` text;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `source_excerpt` text;