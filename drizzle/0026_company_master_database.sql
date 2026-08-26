CREATE TABLE `company_master_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `status` text NOT NULL DEFAULT 'active',
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_claim_types` (
  `id` text PRIMARY KEY NOT NULL,
  `version_id` text NOT NULL,
  `code` text NOT NULL,
  `label` text NOT NULL,
  `sequence` integer NOT NULL DEFAULT 0,
  `active` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_claim_types_version_code_unique` ON `company_claim_types` (`version_id`,`code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_claim_types_version_label_unique` ON `company_claim_types` (`version_id`,`label`);
--> statement-breakpoint
CREATE TABLE `company_currencies` (
  `id` text PRIMARY KEY NOT NULL,
  `version_id` text NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `sequence` integer NOT NULL DEFAULT 0,
  `active` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_currencies_version_code_unique` ON `company_currencies` (`version_id`,`code`);
--> statement-breakpoint
CREATE TABLE `company_destinations` (
  `id` text PRIMARY KEY NOT NULL,
  `version_id` text NOT NULL,
  `country_code` text NOT NULL,
  `country_name` text NOT NULL,
  `city_code` text NOT NULL,
  `city_name` text NOT NULL,
  `sequence` integer NOT NULL DEFAULT 0,
  `active` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_destinations_version_city_code_unique` ON `company_destinations` (`version_id`,`city_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_destinations_version_value_unique` ON `company_destinations` (`version_id`,`country_code`,`country_name`,`city_name`);
