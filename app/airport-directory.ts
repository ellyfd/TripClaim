import airportRows from "../db/managed-airports.json";

export type ManagedAirport={code:string;name:string;city:string;country:string;keywords:string;aliases:string[]};
export const MANAGED_AIRPORTS=airportRows as ManagedAirport[];
export const MANAGED_AIRPORT_CODES=new Set(MANAGED_AIRPORTS.map(airport=>airport.code));

const ignoredWords=/\b(?:INTERNATIONAL|INTL|AIRPORT|AERODROME|REGIONAL|MUNICIPAL)\b/gi;
const clean=(value:string)=>value.replace(ignoredWords," ").replace(/[()[\],./_-]+/g," ").replace(/\s+/g," ").trim();
const escaped=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

const aliasRows=MANAGED_AIRPORTS.flatMap(airport=>{
 const keywordAliases=airport.keywords.split(",").map(value=>value.trim()).filter(value=>value.length>=6&&!/^[A-Z]{3}$/i.test(value));
 const coreName=clean(airport.name);
 return [...airport.aliases,airport.name,coreName,...keywordAliases]
  .map(value=>clean(value))
  .filter(value=>value.length>=6)
  .map(alias=>({alias,code:airport.code}));
}).sort((a,b)=>b.alias.length-a.alias.length);

export function normalizeManagedAirportText(value:string){
 let normalized=value.replace(ignoredWords," ").replace(/\s+/g," ");
 for(const {alias,code} of aliasRows){
  if(normalized.toUpperCase().includes(alias.toUpperCase()))normalized=normalized.replace(new RegExp(escaped(alias),"gi"),` ${code} `);
 }
 return normalized.replace(/\s+/g," ");
}

export function airportsForCountry(countryCode:string){
 return MANAGED_AIRPORTS.filter(airport=>airport.country===countryCode);
}

export const ISO3_TO_ISO2:Record<string,string>={
 AUS:"AU",AUT:"AT",BEL:"BE",BGD:"BD",CAN:"CA",CHE:"CH",CHN:"CN",DEU:"DE",DNK:"DK",DOM:"DO",ESP:"ES",ETH:"ET",FRA:"FR",GBR:"GB",GTM:"GT",HKG:"HK",HND:"HN",IND:"IN",IDN:"ID",ITA:"IT",JPN:"JP",JOR:"JO",KOR:"KR",MYS:"MY",NZL:"NZ",NLD:"NL",PHL:"PH",POL:"PL",SGP:"SG",THA:"TH",TUR:"TR",TWN:"TW",UAE:"AE",USA:"US",VNM:"VN"
};

export function airportsForManagedCity(country:string,cityLabel:string){
 const iso2=ISO3_TO_ISO2[country.match(/[A-Z]{3}$/)?.[0]??""]??"";
 const english=cityLabel.match(/[A-Za-z].*$/)?.[0]??cityLabel;
 const needle=clean(english).toLowerCase();
 return MANAGED_AIRPORTS.filter(airport=>{
  if(airport.country!==iso2)return false;
  const hay=clean([airport.city,airport.name,airport.keywords,...airport.aliases].join(" ")).toLowerCase();
  return hay.includes(needle)||needle.includes(clean(airport.city).toLowerCase());
 });
}
