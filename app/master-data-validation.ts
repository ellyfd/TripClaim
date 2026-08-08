import {decideReportingCurrency,isManagedClaimType,managedClaimTypeCode,MANAGED_CURRENCY_CODES,MASTER_DATA_VERSION,resolveManagedDestination} from "./managed-config";

export type MasterIssue={field:string;rawValue:string;reason:string};
export function validateExpenseMaster(input:{claimType?:string|null;originalCurrency?:string|null;reportingCurrency?:string|null}){
 const issues:MasterIssue[]=[],decision=decideReportingCurrency(input.originalCurrency),claimTypeCode=managedClaimTypeCode(input.claimType);
 if(input.claimType&&!isManagedClaimType(input.claimType))issues.push({field:"claimType",rawValue:input.claimType,reason:"不在公司報支項目主檔"});
 const reportingCurrency=(input.reportingCurrency||decision.reportingCurrency).toUpperCase();
 if(!MANAGED_CURRENCY_CODES.has(reportingCurrency))issues.push({field:"reportingCurrency",rawValue:reportingCurrency,reason:"不在公司申報幣別主檔"});
 if(decision.requiresTwd&&reportingCurrency!=="TWD")issues.push({field:"reportingCurrency",rawValue:reportingCurrency,reason:decision.reason||"非白名單幣別只能以 TWD 申報"});
 return {valid:issues.length===0,issues,claimTypeCode,originalCurrency:decision.originalCurrency,reportingCurrency,currencyDecision:decision,masterDataVersion:MASTER_DATA_VERSION};
}

export function validateDestinationMaster(input:{countryCode?:string;countryName?:string;cityName?:string}){
 const destination=resolveManagedDestination(input.countryCode,input.countryName,input.cityName);
 const issues:MasterIssue[]=destination?[]:[{field:"destination",rawValue:[input.countryCode,input.countryName,input.cityName].filter(Boolean).join(":"),reason:"無法對應公司國家／城市主檔"}];
 return {valid:Boolean(destination),issues,destination,masterDataVersion:MASTER_DATA_VERSION};
}
