ALTER TABLE `personal_expenses` ADD `receipt_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `remark` text;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `cost_center` text DEFAULT 'S2_GP1 100%' NOT NULL;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `exchange_rate` text;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `claimed_twd_minor` integer;