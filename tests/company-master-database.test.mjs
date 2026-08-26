import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("company master data has a versioned D1 schema and additive migration",async()=>{
 const [schema,migration,service]=await Promise.all([
  read("db/master-schema.ts"),
  read("drizzle/0026_company_master_database.sql"),
  read("db/company-master.ts"),
 ]);
 assert.match(schema,/company_master_versions/);
 assert.match(schema,/company_claim_types/);
 assert.match(schema,/company_currencies/);
 assert.match(schema,/company_destinations/);
 assert.match(migration,/company_destinations_version_value_unique/);
 assert.match(service,/getCompanyMasterCatalog/);
 assert.match(service,/validateCompanyDestination/);
 assert.match(service,/validateCompanyExpenseMaster/);
 assert.match(service,/onConflictDoNothing/);
});

test("trip destination UI and write APIs use the same database master catalog",async()=>{
 const [wizard,masterApi,trips,trip]=await Promise.all([
  read("app/CreateTripWizardLive.tsx"),
  read("app/api/master-data/route.ts"),
  read("app/api/trips/route.ts"),
  read("app/api/trips/[id]/route.ts"),
 ]);
 assert.doesNotMatch(wizard,/CreateTripForm/);
 assert.match(wizard,/fetch\("\/api\/master-data"\)/);
 assert.match(wizard,/destinationOptions/);
 assert.match(wizard,/masterVersion/);
 assert.match(masterApi,/getCompanyMasterCatalog/);
 assert.match(trips,/validateCompanyDestination/);
 assert.match(trips,/await Promise\.all/);
 assert.doesNotMatch(trips,/validateDestinationMaster/);
 assert.match(trip,/validateCompanyDestination/);
 assert.doesNotMatch(trip,/validateDestinationMaster/);
});
