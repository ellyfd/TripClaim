const pad=value=>String(value).padStart(2,"0");

const dateParts=value=>{const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?{year:Number(match[1]),month:Number(match[2]),day:Number(match[3])}:null};
const timestampParts=value=>{const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);return match?{year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])}:null};
const dayValue=value=>{const parts=dateParts(value);return parts?Date.UTC(parts.year,parts.month-1,parts.day):null};
const minuteValue=value=>{const parts=timestampParts(value);return parts?Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute)/60000:null};
const minuteAt=(date,hour)=>{const parts=dateParts(date);return parts?Date.UTC(parts.year,parts.month-1,parts.day,hour,0)/60000:null};
const dateFromUtc=value=>`${value.getUTCFullYear()}-${pad(value.getUTCMonth()+1)}-${pad(value.getUTCDate())}`;

export function isSyncedFlight(item){
 return Boolean(item?.notes?.startsWith("booking:")&&item?.type==="交通/車程"&&item?.startsAt&&item?.endsAt);
}

export function flightRequiresFullDay(item){
 if(!isSyncedFlight(item))return false;
 const start=timestampParts(item.startsAt),end=timestampParts(item.endsAt);
 if(!start||!end)return false;
 const startDate=item.startsAt.slice(0,10),endDate=item.endsAt.slice(0,10);
 return startDate!==endDate||start.hour<8||start.hour>22||end.hour<8||end.hour>22;
}

export function calendarDatesForAgenda(tripStart,tripEnd,agenda=[],limit=35){
 let start=String(tripStart||""),end=String(tripEnd||"");
 for(const item of agenda){
  const startDate=item?.startsAt?.slice?.(0,10),endDate=item?.endsAt?.slice?.(0,10);
  if(startDate&&(!start||startDate<start))start=startDate;
  if(endDate&&(!end||endDate>end))end=endDate;
 }
 const first=dayValue(start),last=dayValue(end);
 if(first===null||last===null||last<first)return [];
 const out=[];
 for(let value=first;value<=last&&out.length<limit;value+=86400000)out.push(dateFromUtc(new Date(value)));
 return out;
}

export function buildFlightSegments(dates,agenda=[]){
 const map=new Map();
 for(const item of agenda){
  if(!isSyncedFlight(item))continue;
  const start=minuteValue(item.startsAt),end=minuteValue(item.endsAt);
  if(start===null||end===null||end<=start)continue;
  for(const date of dates){
   const dayStart=minuteAt(date,0);if(dayStart===null)continue;
   const dayEnd=dayStart+1440;
   const dayFlightStart=Math.max(start,dayStart),dayFlightEnd=Math.min(end,dayEnd);
   if(dayFlightStart>=dayFlightEnd)continue;
   for(let hour=0;hour<24;hour++){
    const cellStart=dayStart+hour*60,cellEnd=cellStart+60;
    const overlapStart=Math.max(dayFlightStart,cellStart),overlapEnd=Math.min(dayFlightEnd,cellEnd);
    if(overlapStart>=overlapEnd)continue;
    const first=start>=cellStart&&start<cellEnd,last=end>cellStart&&end<=cellEnd;
    const dayFirst=dayFlightStart>=cellStart&&dayFlightStart<cellEnd,dayLast=dayFlightEnd>cellStart&&dayFlightEnd<=cellEnd;
    const key=`${date}|${pad(hour)}:00`,list=map.get(key)??[];
    list.push({item,first,last,dayFirst,dayLast,topPercent:((overlapStart-cellStart)/60)*100,bottomPercent:((cellEnd-overlapEnd)/60)*100});
    map.set(key,list);
   }
  }
 }
 return map;
}
