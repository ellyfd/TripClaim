import {MANAGED_AIRPORTS} from "./airport-directory";
import {isValidIanaTimezone} from "./timezone-utils";

const normalize=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

// Only countries where the managed commercial destinations do not create a known multi-zone ambiguity.
const COUNTRY_TIMEZONES:Record<string,string>={
 AT:"Europe/Vienna",BE:"Europe/Brussels",BD:"Asia/Dhaka",CH:"Europe/Zurich",CN:"Asia/Shanghai",DE:"Europe/Berlin",DK:"Europe/Copenhagen",DO:"America/Santo_Domingo",ET:"Africa/Addis_Ababa",FR:"Europe/Paris",GB:"Europe/London",GT:"America/Guatemala",HK:"Asia/Hong_Kong",HN:"America/Tegucigalpa",IN:"Asia/Kolkata",IT:"Europe/Rome",JP:"Asia/Tokyo",JO:"Asia/Amman",KR:"Asia/Seoul",MY:"Asia/Kuala_Lumpur",NL:"Europe/Amsterdam",PH:"Asia/Manila",PL:"Europe/Warsaw",SG:"Asia/Singapore",TH:"Asia/Bangkok",TR:"Europe/Istanbul",TW:"Asia/Taipei",AE:"Asia/Dubai",VN:"Asia/Ho_Chi_Minh"
};

// Multi-zone countries are resolved only for company-supported cities / high-confidence airport cities.
const CITY_TIMEZONES:Record<string,string>={
 "sydney":"Australia/Sydney","brisbane":"Australia/Brisbane","melbourne":"Australia/Melbourne",
 "toronto":"America/Toronto","kelowna":"America/Vancouver","vancouver":"America/Vancouver",
 "barcelona":"Europe/Madrid","madrid":"Europe/Madrid","la coruna":"Europe/Madrid","a coruna":"Europe/Madrid",
 "semarang":"Asia/Jakarta","jakarta":"Asia/Jakarta","surakarta":"Asia/Jakarta","solo":"Asia/Jakarta","bandung":"Asia/Jakarta","denpasar":"Asia/Makassar","bali":"Asia/Makassar",
 "auckland":"Pacific/Auckland",
 "minneapolis":"America/Chicago","boston":"America/New_York","los angeles":"America/Los_Angeles","new york":"America/New_York","milwaukee":"America/Chicago","san francisco":"America/Los_Angeles","denver":"America/Denver","pittsburgh":"America/New_York","houston":"America/Chicago","seattle":"America/Los_Angeles","atlanta":"America/New_York","las vegas":"America/Los_Angeles","chicago":"America/Chicago","columbus":"America/New_York","nashville":"America/Chicago","washington":"America/New_York","orlando":"America/New_York","san diego":"America/Los_Angeles","dallas":"America/Chicago","phoenix":"America/Phoenix","miami":"America/New_York"
};

const AIRPORT_OVERRIDES:Record<string,string>={PDX:"America/Los_Angeles",PWM:"America/New_York"};

export type AirportTimezoneResolution={code:string;timezone:string|null;source:"airport_override"|"managed_city"|"country_default"|"unresolved"};

export function resolveAirportTimezone(code:string|undefined|null):AirportTimezoneResolution{
 const normalized=String(code||"").trim().toUpperCase();
 if(!/^[A-Z]{3}$/.test(normalized))return {code:normalized,timezone:null,source:"unresolved"};
 const override=AIRPORT_OVERRIDES[normalized];if(override)return {code:normalized,timezone:override,source:"airport_override"};
 const airport=MANAGED_AIRPORTS.find(row=>row.code===normalized);if(!airport)return {code:normalized,timezone:null,source:"unresolved"};
 const candidates=[airport.city,...airport.aliases,airport.name].map(normalize).filter(Boolean);
 for(const candidate of candidates){for(const [city,timezone] of Object.entries(CITY_TIMEZONES))if(candidate===city||candidate.includes(city)||city.includes(candidate))return {code:normalized,timezone,source:"managed_city"}}
 const country=COUNTRY_TIMEZONES[airport.country];if(country&&isValidIanaTimezone(country))return {code:normalized,timezone:country,source:"country_default"};
 return {code:normalized,timezone:null,source:"unresolved"};
}

export const MANAGED_TRAVEL_TIMEZONES=[...new Set([...Object.values(COUNTRY_TIMEZONES),...Object.values(CITY_TIMEZONES),...Object.values(AIRPORT_OVERRIDES)])].sort();
