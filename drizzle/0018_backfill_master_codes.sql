UPDATE `personal_expenses` SET `category_code` = CASE `category`
 WHEN '機票(自行刷卡)' THEN 'EXP-01' WHEN '住宿' THEN 'EXP-02' WHEN '車資' THEN 'EXP-03'
 WHEN '落地簽證費' THEN 'EXP-04' WHEN '預支歸還' THEN 'EXP-05' WHEN '餐飲' THEN 'EXP-06'
 WHEN '交際費／伴手禮' THEN 'EXP-07' WHEN '行李託運費' THEN 'EXP-08' WHEN '疫苗／檢測費用' THEN 'EXP-09'
 WHEN '探親樣衣' THEN 'EXP-10' WHEN '無報支費用' THEN 'EXP-11' WHEN '電信網路費' THEN 'EXP-12'
 WHEN '簽證費用' THEN 'EXP-13' WHEN '國外交易手續費' THEN 'EXP-14' ELSE NULL END
WHERE `category_code` IS NULL;--> statement-breakpoint
INSERT INTO `master_data_exceptions` (`id`,`trip_id`,`owner_email`,`source_type`,`source_id`,`field_name`,`raw_value`,`master_data_version`,`status`,`created_at`)
SELECT lower(hex(randomblob(16))),`trip_id`,`owner_email`,'legacy_expense',`id`,'category',`category`,`master_data_version`,'open',datetime('now')
FROM `personal_expenses` WHERE `category_code` IS NULL;--> statement-breakpoint
INSERT INTO `master_data_exceptions` (`id`,`trip_id`,`owner_email`,`source_type`,`source_id`,`field_name`,`raw_value`,`master_data_version`,`status`,`created_at`)
SELECT lower(hex(randomblob(16))),`trip_id`,`owner_email`,'legacy_expense',`id`,'reporting_currency',coalesce(`reporting_currency`,`currency`),`master_data_version`,'open',datetime('now')
FROM `personal_expenses` WHERE upper(coalesce(`reporting_currency`,`currency`)) NOT IN ('TWD','USD','CNY','JPY','IDR','KHR','GBP','HKD','PHP','VND','EUR','KRW','TRY','DKK','CAD','GTQ','INR','ETB','BDT','AED','JOD','EGP','THB','SGD','AUD');--> statement-breakpoint
INSERT INTO `master_data_exceptions` (`id`,`trip_id`,`owner_email`,`source_type`,`source_id`,`field_name`,`raw_value`,`master_data_version`,`status`,`created_at`)
SELECT lower(hex(randomblob(16))),d.`trip_id`,t.`created_by_email`,'legacy_destination',d.`id`,'city',d.`country_code`||':'||d.`city_name`,t.`master_data_version`,'open',datetime('now')
FROM `trip_destinations` d JOIN `trips` t ON t.`id`=d.`trip_id` WHERE d.`city_code` IS NULL;
