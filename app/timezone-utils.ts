export type FlightTimingInput={departureLocalAt:string;departureTimezone:string;arrivalLocalAt:string;arrivalTimezone:string};
export type FlightTimingResult={departureUtcAt:string;arrivalUtcAt:string;durationMinutes:number;departureOffsetMinutes:number;arrivalOffsetMinutes:number;timezoneDifferenceMinutes:number};

type Parts={year:number;month:number;day:number;hour:number;minute:number};

const parseLocal=(value:string):Parts|null=>{const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!match)return null;const parts={year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])};if(parts.month<1||parts.month>12||parts.day<1||parts.day>31||parts.hour>23||parts.minute>59)return null;return parts};
const sameParts=(a:Parts,b:Parts)=>a.year===b.year&&a.month===b.month&&a.day===b.day&&a.hour===b.hour&&a.minute===b.minute;
const asUtcMs=(parts:Parts)=>Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);

export const isValidIanaTimezone=(value:string|undefined|null)=>{if(!value?.trim())return false;try{new Intl.DateTimeFormat("en",{timeZone:value.trim()}).format(new Date(0));return true}catch{return false}};

const partsAt=(utcMs:number,timeZone:string):Parts|null=>{try{const values:Record<string,string>={};for(const part of new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(utcMs)))if(part.type!=="literal")values[part.type]=part.value;const parts={year:Number(values.year),month:Number(values.month),day:Number(values.day),hour:Number(values.hour),minute:Number(values.minute)};return Object.values(parts).every(Number.isFinite)?parts:null}catch{return null}};

export function zonedLocalToUtc(localAt:string,timeZone:string):string|null{
 const target=parseLocal(localAt);if(!target||!isValidIanaTimezone(timeZone))return null;
 const targetMs=asUtcMs(target);let guess=targetMs;
 for(let index=0;index<4;index++){const observed=partsAt(guess,timeZone);if(!observed)return null;const delta=targetMs-asUtcMs(observed);guess+=delta;if(delta===0)break}
 const verified=partsAt(guess,timeZone);if(!verified||!sameParts(target,verified))return null;
 return new Date(guess).toISOString();
}

export function utcOffsetMinutes(utcAt:string,timeZone:string):number|null{
 const utcMs=Date.parse(utcAt);if(!Number.isFinite(utcMs)||!isValidIanaTimezone(timeZone))return null;
 const local=partsAt(utcMs,timeZone);if(!local)return null;
 return Math.round((asUtcMs(local)-utcMs)/60000);
}

export function flightTiming(input:FlightTimingInput):FlightTimingResult|null{
 const departureUtcAt=zonedLocalToUtc(input.departureLocalAt,input.departureTimezone),arrivalUtcAt=zonedLocalToUtc(input.arrivalLocalAt,input.arrivalTimezone);if(!departureUtcAt||!arrivalUtcAt)return null;
 const durationMinutes=Math.round((Date.parse(arrivalUtcAt)-Date.parse(departureUtcAt))/60000);if(durationMinutes<=0)return null;
 const departureOffsetMinutes=utcOffsetMinutes(departureUtcAt,input.departureTimezone),arrivalOffsetMinutes=utcOffsetMinutes(arrivalUtcAt,input.arrivalTimezone);if(departureOffsetMinutes===null||arrivalOffsetMinutes===null)return null;
 return {departureUtcAt,arrivalUtcAt,durationMinutes,departureOffsetMinutes,arrivalOffsetMinutes,timezoneDifferenceMinutes:arrivalOffsetMinutes-departureOffsetMinutes};
}

export const formatDurationMinutes=(minutes:number)=>`${Math.floor(minutes/60)}h${minutes%60?`${String(minutes%60).padStart(2,"0")}m`:""}`;
export const formatUtcOffset=(minutes:number)=>{const sign=minutes>=0?"+":"-",absolute=Math.abs(minutes),hours=Math.floor(absolute/60),rest=absolute%60;return `UTC${sign}${hours}${rest?`:${String(rest).padStart(2,"0")}`:""}`};
export const formatTimezoneDifference=(minutes:number)=>minutes===0?"無時差":`時差 ${minutes>0?"+":"-"}${formatDurationMinutes(Math.abs(minutes))}`;
