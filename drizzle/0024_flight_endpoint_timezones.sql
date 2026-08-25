ALTER TABLE `travel_bookings` ADD COLUMN `departure_timezone` text;
--> statement-breakpoint
ALTER TABLE `travel_bookings` ADD COLUMN `departure_utc_at` text;
--> statement-breakpoint
ALTER TABLE `travel_bookings` ADD COLUMN `arrival_timezone` text;
--> statement-breakpoint
ALTER TABLE `travel_bookings` ADD COLUMN `arrival_utc_at` text;
