ALTER TABLE `personal_expenses` ADD `original_amount_minor` integer;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `original_currency` text;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `reporting_amount_minor` integer;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `reporting_currency` text;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `exchange_rate_source` text;--> statement-breakpoint
ALTER TABLE `personal_expenses` ADD `currency_decision_reason` text;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `detected_currency` text;--> statement-breakpoint
ALTER TABLE `uploaded_documents` ADD `detected_amount_minor` integer;--> statement-breakpoint
UPDATE `personal_expenses`
SET `original_amount_minor` = `amount_minor`,
    `original_currency` = `currency`,
    `reporting_amount_minor` = COALESCE(`claimed_twd_minor`, `amount_minor`),
    `reporting_currency` = CASE WHEN `claimed_twd_minor` IS NOT NULL THEN 'TWD' ELSE `currency` END,
    `currency_decision_reason` = CASE WHEN `claimed_twd_minor` IS NOT NULL THEN '既有請款金額回填為 TWD' ELSE NULL END;
