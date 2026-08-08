ALTER TABLE `trips` ADD `master_data_version` text DEFAULT 'company-2026-08-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `master_data_version` text DEFAULT 'company-2026-08-v1' NOT NULL;
