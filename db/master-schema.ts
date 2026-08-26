import {integer,sqliteTable,text} from "drizzle-orm/sqlite-core";

export const companyMasterVersions=sqliteTable("company_master_versions",{
 id:text("id").primaryKey(),
 status:text("status",{enum:["active","retired"]}).notNull().default("active"),
 createdAt:text("created_at").notNull(),
});

export const companyClaimTypes=sqliteTable("company_claim_types",{
 id:text("id").primaryKey(),
 versionId:text("version_id").notNull(),
 code:text("code").notNull(),
 label:text("label").notNull(),
 sequence:integer("sequence").notNull().default(0),
 active:integer("active",{mode:"boolean"}).notNull().default(true),
});

export const companyCurrencies=sqliteTable("company_currencies",{
 id:text("id").primaryKey(),
 versionId:text("version_id").notNull(),
 code:text("code").notNull(),
 name:text("name").notNull(),
 sequence:integer("sequence").notNull().default(0),
 active:integer("active",{mode:"boolean"}).notNull().default(true),
});

export const companyDestinations=sqliteTable("company_destinations",{
 id:text("id").primaryKey(),
 versionId:text("version_id").notNull(),
 countryCode:text("country_code").notNull(),
 countryName:text("country_name").notNull(),
 cityCode:text("city_code").notNull(),
 cityName:text("city_name").notNull(),
 sequence:integer("sequence").notNull().default(0),
 active:integer("active",{mode:"boolean"}).notNull().default(true),
});
