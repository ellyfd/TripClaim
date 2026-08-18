const pad=value=>String(value).padStart(2,"0");
const MONTH_INDEX=new Map(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].map((month,index)=>[month,index+1]));

function normalizeDateToken(value){
 const compact=value.match(/\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})\b/i);
 if(compact){const year=compact[3].length===2?`20${compact[3]}`:compact[3];return `${year}-${pad(MONTH_INDEX.get(compact[2].toUpperCase()))}-${pad(compact[1])}`;}
 const iso=value.match(/\b(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/);
 return iso?`${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`:null;
}

function timeTokens(value){
 const tokens=[];
 for(const match of value.matchAll(/\b([0-2]?\d)[:.]([0-5]\d)\b/g)){
  const hour=Number(match[1]);if(hour<=23)tokens.push({index:match.index??0,value:`${pad(hour)}:${match[2]}`});
 }
 // Some e-ticket text layers collapse HH:MM to HHMM. Avoid 20xx because it is ambiguous with a year.
 for(const match of value.matchAll(/\b((?:[01]\d|2[0-3])([0-5]\d))\b/g)){
  if(match[1].startsWith("20"))continue;
  const index=match.index??0;
  if(tokens.some(token=>Math.abs(token.index-index)<=1))continue;
  tokens.push({index,value:`${match[1].slice(0,2)}:${match[2]}`});
 }
 return tokens.sort((a,b)=>a.index-b.index);
}

function dateTokens(value){
 const matches=[
  ...value.matchAll(/\b\d{1,2}(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2,4}\b/gi),
  ...value.matchAll(/\b20\d{2}[\/.-]\d{1,2}[\/.-]\d{1,2}\b/g),
 ].map(match=>({index:match.index??0,value:normalizeDateToken(match[0])})).filter(token=>token.value);
 return matches.sort((a,b)=>a.index-b.index);
}

function nearestRoute(source,flightIndex,isAirportCode){
 const before=source.slice(Math.max(0,flightIndex-320),flightIndex).toUpperCase();
 const beforeCodes=[...before.matchAll(/\b([A-Z]{3})\b/g)].map(match=>match[1]).filter(isAirportCode);
 const distinct=[];
 for(let index=beforeCodes.length-1;index>=0&&distinct.length<2;index--){if(!distinct.includes(beforeCodes[index]))distinct.unshift(beforeCodes[index]);}
 if(distinct.length===2)return {origin:distinct[0],destination:distinct[1]};
 const after=source.slice(flightIndex,flightIndex+180).toUpperCase();
 const afterCodes=[...after.matchAll(/\b([A-Z]{3})\b/g)].map(match=>match[1]).filter(isAirportCode);
 for(const code of afterCodes){if(!distinct.includes(code))distinct.push(code);if(distinct.length===2)break;}
 return distinct.length===2?{origin:distinct[0],destination:distinct[1]}:null;
}

/**
 * Parse complete flight legs around each flight-number anchor. It intentionally does not require
 * terminal/class/date/time fields to appear in one fixed order; each flight block is resolved
 * independently from its nearby route, first two dates and first two times.
 */
export function extractFlightSegments(source,isAirportCode){
 const flightMatches=[...source.matchAll(/\b([A-Z]{2})\s?(\d{2,4})\b/g)];
 const segments=[];
 for(let index=0;index<flightMatches.length;index++){
  const flight=flightMatches[index],flightIndex=flight.index??0;
  const nextIndex=flightMatches[index+1]?.index??source.length;
  const block=source.slice(flightIndex,Math.min(nextIndex,flightIndex+520));
  const route=nearestRoute(source,flightIndex,isAirportCode),dates=dateTokens(block),times=timeTokens(block);
  if(!route||dates.length<2||times.length<2)continue;
  const startAt=`${dates[0].value}T${times[0].value}`,endAt=`${dates[1].value}T${times[1].value}`;
  if(endAt<=startAt)continue;
  segments.push({title:`${flight[1].toUpperCase()}${flight[2]} ${route.origin} → ${route.destination}`,startAt,endAt,origin:route.origin,destination:route.destination,duration:null});
 }
 return segments;
}
