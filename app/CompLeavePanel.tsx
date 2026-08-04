"use client";
import {useEffect,useMemo,useState} from "react";

type Summary={trip:{startsOn:string;endsOn:string};bookings:Array<{kind:string;ownerEmail:string;startAt:string;endAt:string;title:string}>};
const weekend=(date:string)=>[0,6].includes(new Date(`${date}T12:00:00`).getDay());

export default function CompLeavePanel({tripId}:{tripId:string}){
 const [data,setData]=useState<Summary|null>(null),[email,setEmail]=useState(""),[manual,setManual]=useState<number|null>(null);
 useEffect(()=>{Promise.all([
  fetch(`/api/trips/${tripId}/summary`).then(r=>r.ok?r.json():null),
  fetch("/api/me").then(r=>r.ok?r.json():null)
 ]).then(([summary,me])=>{setData(summary);setEmail(me?.email??"")}).catch(()=>null)},[tripId]);
 const result=useMemo(()=>{
  if(!data)return null;
  const flights=data.bookings.filter(x=>x.kind==="flight"&&(!email||x.ownerEmail===email)).sort((a,b)=>a.startAt.localeCompare(b.startAt)),out=flights[0],back=flights.at(-1);
  let days=0;const notes:string[]=[];
  if(out){const date=out.startAt.slice(0,10),hour=Number(out.startAt.slice(11,13));if(weekend(date)){const value=hour<12?.5:1;days+=value;notes.push(`去程 ${date} ${hour<12?"中午前":"中午後"}：週末 ${value} 天`)}else notes.push(`去程 ${date}：工作日，暫不計補休`)}
  if(back){const date=back.endAt.slice(0,10),hour=Number(back.endAt.slice(11,13));if(weekend(date)){const value=hour<12?.5:1;days+=value;notes.push(`回程抵達 ${date} ${hour<12?"中午前":"中午後"}：週末 ${value} 天`)}else notes.push(`回程抵達 ${date}：工作日，暫不計補休`)}
  return {days,notes,hasFlights:flights.length>0};
 },[data,email]);
 if(!result)return null;
 return <section className="comp-leave panel"><span>我的補休試算</span><div><h2>{manual??result.days} 天</h2><button onClick={()=>setManual(manual==null?result.days:manual+.5)}>＋0.5</button><button onClick={()=>setManual(Math.max(0,(manual??result.days)-.5))}>－0.5</button></div>{result.hasFlights?<ul>{result.notes.map(x=><li key={x}>{x}</li>)}</ul>:<p>上傳或登記去回程機票後，才會自動比對。</p>}<small>依班機時間與週末先試算；國定假日、調整上班日及颱風假須再與公司行事曆核對。人工修改只影響本人。</small></section>;
}
