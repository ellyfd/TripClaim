"use client";
import {useCallback,useEffect,useMemo,useState} from "react";

type Summary={trip:{startsOn:string;endsOn:string};bookings:Array<{kind:string;ownerEmail:string;startAt:string;endAt:string;title:string}>};
type CompLeaveState={currentUserEmail?:string;overrideHalfUnits:number|null};
const weekend=(date:string)=>[0,6].includes(new Date(`${date}T12:00:00`).getDay());

export default function CompLeavePanel({tripId}:{tripId:string}){
 const [data,setData]=useState<Summary|null>(null),[email,setEmail]=useState(""),[overrideHalfUnits,setOverrideHalfUnits]=useState<number|null>(null),[saving,setSaving]=useState(false),[status,setStatus]=useState("正在同步補休試算…");
 const load=useCallback(async()=>{setStatus("正在同步補休試算…");try{const [summaryResponse,overrideResponse]=await Promise.all([fetch(`/api/trips/${tripId}/summary`),fetch(`/api/trips/${tripId}/comp-leave`)]);if(!summaryResponse.ok||!overrideResponse.ok)throw new Error("load_failed");const [summary,override]=await Promise.all([summaryResponse.json(),overrideResponse.json()]) as [Summary,CompLeaveState];setData(summary);setEmail(override.currentUserEmail??"");setOverrideHalfUnits(override.overrideHalfUnits??null);setStatus("")}catch{setData(null);setStatus("補休資料載入失敗，請重新整理")}},[tripId]);
 useEffect(()=>{void load();const reload=()=>void load();window.addEventListener("tripclaim:data-changed",reload);return()=>window.removeEventListener("tripclaim:data-changed",reload)},[load]);
 const result=useMemo(()=>{
  if(!data)return null;
  const flights=data.bookings.filter(x=>x.kind==="flight"&&(!email||x.ownerEmail===email)).sort((a,b)=>a.startAt.localeCompare(b.startAt)),out=flights[0],back=flights.at(-1);
  let days=0;const notes:string[]=[];
  if(out){const date=out.startAt.slice(0,10),hour=Number(out.startAt.slice(11,13));if(weekend(date)){const value=hour<12?.5:1;days+=value;notes.push(`去程 ${date} ${hour<12?"中午前":"中午後"}：週末 ${value} 天`)}else notes.push(`去程 ${date}：工作日，暫不計補休`)}
  if(back){const date=back.endAt.slice(0,10),hour=Number(back.endAt.slice(11,13));if(weekend(date)){const value=hour<12?.5:1;days+=value;notes.push(`回程抵達 ${date} ${hour<12?"中午前":"中午後"}：週末 ${value} 天`)}else notes.push(`回程抵達 ${date}：工作日，暫不計補休`)}
  return {days,notes,hasFlights:flights.length>0};
 },[data,email]);
 const calculatedHalfUnits=Math.round((result?.days??0)*2),effectiveHalfUnits=overrideHalfUnits??calculatedHalfUnits;
 const saveOverride=async(halfUnits:number)=>{if(saving)return;setSaving(true);setStatus("正在保存本人補休…");try{const response=await fetch(`/api/trips/${tripId}/comp-leave`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({halfUnits})});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||"save_failed");setOverrideHalfUnits(body.overrideHalfUnits);setStatus("已保存本人補休調整")}catch{setStatus("補休保存失敗，畫面未套用這次調整；請重試")}finally{setSaving(false)}};
 const resetOverride=async()=>{if(saving)return;setSaving(true);setStatus("正在恢復自動試算…");try{const response=await fetch(`/api/trips/${tripId}/comp-leave`,{method:"DELETE"});if(!response.ok)throw new Error("reset_failed");setOverrideHalfUnits(null);setStatus("已恢復自動試算")}catch{setStatus("無法恢復自動試算，原本設定仍保留；請重試")}finally{setSaving(false)}};
 if(!result)return <section className="comp-leave panel"><span>我的補休試算</span><p role="status" aria-live="polite">{status}</p></section>;
 return <section className="comp-leave panel"><span>我的補休試算</span><div><h2>{effectiveHalfUnits/2} 天</h2><button disabled={saving||effectiveHalfUnits>=730} onClick={()=>void saveOverride(effectiveHalfUnits+1)}>＋0.5</button><button disabled={saving||effectiveHalfUnits<=0} onClick={()=>void saveOverride(Math.max(0,effectiveHalfUnits-1))}>－0.5</button></div>{overrideHalfUnits!==null&&<div className="comp-leave-mode"><b>已人工調整</b><button disabled={saving} onClick={()=>void resetOverride()}>恢復自動試算</button></div>}{status&&<p className="comp-leave-status" role="status" aria-live="polite">{status}</p>}{result.hasFlights?<ul>{result.notes.map(x=><li key={x}>{x}</li>)}</ul>:<p>上傳或登記去回程機票後，才會自動比對；也可以先人工調整本人補休。</p>}<small>依班機時間與週末先試算；國定假日、調整上班日及颱風假須再與公司行事曆核對。人工調整會保存到本人資料，可隨時恢復自動試算。</small></section>;
}
