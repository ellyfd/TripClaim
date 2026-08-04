CREATE TABLE `personal_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`issuer` text NOT NULL,
	`label` text NOT NULL,
	`last4` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
