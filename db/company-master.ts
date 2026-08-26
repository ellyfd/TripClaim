import {and,eq} from "drizzle-orm";
import {getDb} from ".";
import {CLAIM_TYPE_CODES,DEFAULT_CLAIM_TYPES,DEFAULT_CURRENCIES,DEFAULT_DESTINATIONS,MASTER_DATA_VERSION} from "../app/managed-config";
import {companyClaimTypes,companyCurrencies,companyDestinations,companyMasterVersions} from "./master-schema";

export {MASTER_DATA_VERSION};

let seedPromise:Promise<void>|null=null;

const parseCountry=(value:string)=>{
 const match=value.match(/^(.*)\s([A-Z]{3})$/);
 if(!match)throw new Error(`Invalid managed country label: ${value}`);
 return {countryName:match[1],countryCode:match[2]};
};

async function seedCompanyMasterData(){
 const db=await getDb();
 const [existing]=await db.select({id:companyMasterVersions.id}).from(companyMasterVersions).where(eq(companyMasterVersions.id,MASTER_DATA_VERSION)).limit(1);
 if(existing)return;
 const now=new Date().toISOString();
 const claimRows=DEFAULT_CLAIM_TYPES.map((label,index)=>({id:`${MASTER_DATA_VERSION}:claim:${CLAIM_TYPE_CODES[label]}`,versionId:MASTER_DATA_VERSION,code:CLAIM_TYPE_CODES[label],label,sequence:index,active:true}));
 const currencyRows=DEFAULT_CURRENCIES.map(([code,name],index)=>({id:`${MASTER_DATA_VERSION}:currency:${code}`,versionId:MASTER_DATA_VERSION,code,name,sequence:index,active:true}));
 const destinationRows=Object.entries(DEFAULT_DESTINATIONS).flatMap(([countryLabel,cities],countryIndex)=>{
  const {countryCode,countryName}=parseCountry(countryLabel);
  return cities.map((cityName,cityIndex)=>({id:`${MASTER_DATA_VERSION}:destination:${countryCode}-${String(cityIndex+1).padStart(3,"0")}`,versionId:MASTER_DATA_VERSION,countryCode,countryName,cityCode:`${countryCode}-${String(cityIndex+1).padStart(3,"0")}`,cityName,sequence:countryIndex*1000+cityIndex,active:true}));
 });
 await db.batch([
  db.insert(companyMasterVersions).values({id:MASTER_DATA_VERSION,status:"active",createdAt:now}).onConflictDoNothing(),
  db.insert(companyClaimTypes).values(claimRows).onConflictDoNothing(),
  db.insert(companyCurrencies).values(currencyRows).onConflictDoNothing(),
  db.insert(companyDestinations).values(destinationRows).onConflictDoNothing(),
 ]);
}

export async function ensureCompanyMasterData(){
 seedPromise??=seedCompanyMasterData().catch(error=>{seedPromise=null;throw error});
 await seedPromise;
}

export async function getCompanyMasterCatalog(){
 await ensureCompanyMasterData();
 const db=await getDb();
 const [claims,currencies,destinations]=await Promise.all([
  db.select().from(companyClaimTypes).where(and(eq(companyClaimTypes.versionId,MASTER_DATA_VERSION),eq(companyClaimTypes.active,true))),
  db.select().from(companyCurrencies).where(and(eq(companyCurrencies.versionId,MASTER_DATA_VERSION),eq(companyCurrencies.active,true))),
  db.select().from(companyDestinations).where(and(eq(companyDestinations.versionId,MASTER_DATA_VERSION),eq(companyDestinations.active,true))),
 ]);
 return {
  version:MASTER_DATA_VERSION,
  claimTypes:claims.sort((a,b)=>a.sequence-b.sequence).map(({code,label})=>({code,label})),
  currencies:currencies.sort((a,b)=>a.sequence-b.sequence).map(({code,name})=>({code,name})),
  destinations:destinations.sort((a,b)=>a.sequence-b.sequence).map(({countryCode,countryName,cityCode,cityName})=>({countryCode,countryName,cityCode,cityName})),
 };
}

export async function validateDestinationMaster(input:{countryCode?:string;countryName?:string;cityName?:string}){
 await ensureCompanyMasterData();
 const countryCode=input.countryCode?.trim().toUpperCase(),countryName=input.countryName?.trim(),cityName=input.cityName?.trim();
 if(!countryCode||!countryName||!cityName)return {valid:false,destination:null,masterDataVersion:MASTER_DATA_VERSION};
 const db=await getDb();
 const [destination]=await db.select().from(companyDestinations).where(and(eq(companyDestinations.versionId,MASTER_DATA_VERSION),eq(companyDestinations.active,true),eq(companyDestinations.countryCode,countryCode),eq(companyDestinations.countryName,countryName),eq(companyDestinations.cityName,cityName))).limit(1);
 return {valid:Boolean(destination),destination:destination?{countryCode:destination.countryCode,countryName:destination.countryName,cityCode:destination.cityCode,cityName:destination.cityName}:null,masterDataVersion:MASTER_DATA_VERSION};
}

export const validateCompanyDestination=validateDestinationMaster;

export async function validateCompanyExpenseMaster(input:{claimType?:string|null;originalCurrency?:string|null;reportingCurrency?:string|null}){
 await ensureCompanyMasterData();
 const db=await getDb(),claimType=input.claimType?.trim()||null,originalCurrency=(input.originalCurrency||"TWD").trim().toUpperCase()||"TWD",requestedReporting=input.reportingCurrency?.trim().toUpperCase()||null;
 const [claims,currencies]=await Promise.all([
  db.select().from(companyClaimTypes).where(and(eq(companyClaimTypes.versionId,MASTER_DATA_VERSION),eq(companyClaimTypes.active,true))),
  db.select().from(companyCurrencies).where(and(eq(companyCurrencies.versionId,MASTER_DATA_VERSION),eq(companyCurrencies.active,true))),
 ]);
 const claim=claimType?claims.find(row=>row.label===claimType):null,currencyCodes=new Set(currencies.map(row=>row.code)),originalAllowed=currencyCodes.has(originalCurrency),reportingCurrency=requestedReporting||(originalAllowed?originalCurrency:"TWD"),issues:Array<{field:string;rawValue:string;reason:string}>=[];
 if(claimType&&!claim)issues.push({field:"claimType",rawValue:claimType,reason:"不在公司報支項目主檔"});
 if(!currencyCodes.has(reportingCurrency))issues.push({field:"reportingCurrency",rawValue:reportingCurrency,reason:"不在公司申報幣別主檔"});
 const reason=originalAllowed?null:`${originalCurrency} 不在公司可申報幣別，只能以 TWD 報支`;
 if(!originalAllowed&&reportingCurrency!=="TWD")issues.push({field:"reportingCurrency",rawValue:reportingCurrency,reason:reason!});
 return {valid:issues.length===0,issues,claimTypeCode:claim?.code??null,originalCurrency,reportingCurrency,currencyDecision:{originalCurrency,reportingCurrency,requiresTwd:!originalAllowed,reason},masterDataVersion:MASTER_DATA_VERSION};
}
