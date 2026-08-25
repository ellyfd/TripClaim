"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";

type WorkspaceStage="itinerary"|"preparation"|"expense";
type Summary={trip?:{name:string;startsOn:string;endsOn:string};destinations?:Array<{cityName:string;countryName:string}>;members?:Array<{userEmail:string}>;agenda?:Array<{id:string;title:string;startsAt:string;type:string}>;bookings?:Array<{id:string;ownerEmail:string;kind:"flight"|"stay"}>};
type TodoResponse={currentUserEmail?:string;members?:Array<{userEmail:string;items:Record<string,{checked:boolean}>}>};
type MissingResponse={requirements?:Array<{id:string;status:"complete"|"missing"|"review"}>};
const dateLabel=(value?:string)=>value?value.replaceAll("-","/"):"—";

export default function TripOverview({tripId,onNavigate}:{tripId:string;onNavigate:(stage:WorkspaceStage)=>void}){
 const [summary,setSummary]=useState<Summary|null>(null),[todos,setTodos]=useState<TodoResponse|null>(null),[missing,setMissing]=useState<MissingResponse|null>(null),[status,setStatus]=useState("正在整理這趟出差…");
 const seq=useRef(0);
 const load=useCallback(async()=>{const current=++seq.current;setStatus("正在整理這趟出差…");try{const [summaryResponse,todoResponse,missingResponse]=await Promise.all([fetch(`/api/trips/${tripId}/summary`),fetch(`/api/trips/${tripId}/todos`),fetch(`/api/missing-requirements?tripId=${encodeURIComponent(tripId)}`)]);if(!summaryResponse.ok||!todoResponse.ok||!missingResponse.ok)throw new Error("load_failed");const [nextSummary,nextTodos,nextMissing]=await Promise.all([summaryResponse.json(),todoResponse.json(),missingResponse.json()]);if(current!==seq.current)return;setSummary(nextSummary);setTodos(nextTodos);setMissing(nextMissing);setStatus("已同步最新狀態")}catch{if(current!==seq.current)return;setSummary(null);setTodos(null);setMissing(null);setStatus("總覽載入失敗，請重新整理")}},[tripId]);
 useEffect(()=>{setSummary(null);setTodos(null);setMissing(null);void load();const reload=()=>void load();window.addEventListener("tripclaim:data-changed",reload);return()=>{seq.current++;window.removeEventListener("tripclaim:data-changed",reload)}},[load]);
 const mine=useMemo(()=>todos?.members?.find(member=>member.userEmail===todos.currentUserEmail),[todos]);
 const prepItems=mine?Object.values(mine.items):[],prepDone=prepItems.filter(item=>item.checked).length,prepTotal=prepItems.length||4;
 const agendaCount=summary?.agenda?.length??0,bookingCount=summary?.bookings?.length??0;
 const unresolved=missing?.requirements?.filter(item=>item.status!=="complete").length??0;
 const nextAgenda=summary?.agenda?.find(item=>item.startsAt>=new Date().toISOString().slice(0,16))??summary?.agenda?.[0]??null;
 const destinationLabel=summary?.destinations?.map(item=>item.cityName).filter(Boolean).join(" → ")||"地點待確認";
 const nextStage:WorkspaceStage=prepDone<prepTotal?"preparation":agendaCount===0?"itinerary":"expense";
 const nextLabel=nextStage==="preparation"?"補齊行前資料":nextStage==="itinerary"?"安排行程":"整理我的報支";
 return <main className="trip-overview-page">
  <header className="trip-overview-hero"><div><span>出差總覽</span><h1>{summary?.trip?.name??"出差總覽"}</h1><p>{destinationLabel}・{dateLabel(summary?.trip?.startsOn)} → {dateLabel(summary?.trip?.endsOn)}</p></div><button onClick={()=>onNavigate(nextStage)}>下一步：{nextLabel} →</button></header>
  <p className="overview-sync" role="status" aria-live="polite">{status}</p>
  <section className="overview-status-grid" aria-label="出差工作區狀態">
   <article className="overview-card preparation"><span>行前準備</span><strong>{prepDone}/{prepTotal}</strong><p>{prepDone===prepTotal?"我的行前資料已齊全":"機票、住宿、待辦與補休都在這裡完成"}</p><button onClick={()=>onNavigate("preparation")}>{prepDone===prepTotal?"查看行前準備":"繼續準備"}</button></article>
   <article className="overview-card itinerary"><span>行程</span><strong>{agendaCount}</strong><p>{agendaCount?`已有 ${agendaCount} 筆共同行程${bookingCount?`・其中 ${bookingCount} 筆來自機票／住宿同步`:""}`:"還沒有共同行程"}</p><button onClick={()=>onNavigate("itinerary")}>{agendaCount?"查看／編輯行程":"開始安排行程"}</button></article>
   <article className="overview-card claim"><span>我的報支</span><strong>{unresolved}</strong><p>{unresolved?`${unresolved} 項待確認／缺件需要處理`:"目前沒有待處理缺件"}</p><button onClick={()=>onNavigate("expense")}>{unresolved?"處理我的報支":"查看我的報支"}</button></article>
  </section>
  <section className="overview-detail-grid">
   <article className="panel overview-next"><span>下一個行程</span>{nextAgenda?<><h2>{nextAgenda.title}</h2><p>{nextAgenda.startsAt.replace("T"," ")}・{nextAgenda.type}</p><button onClick={()=>onNavigate("itinerary")}>打開行程</button></>:<><h2>尚未安排行程</h2><p>先把共同行程排進日曆，同行者就能看到同一份最新版本。</p><button onClick={()=>onNavigate("itinerary")}>新增第一筆行程</button></>}</article>
   <article className="panel overview-ownership"><span>共用與個人資料分開</span><h2>同行者只看到需要共用的內容</h2><p>行程與同步後的機票／住宿時間會讓同行者看見；原始附件、補休與個人報支仍只在自己的工作區處理。</p><small>{summary?.members?.length??0} 位同行者・總覽只整理狀態，不另外複製一份資料。</small></article>
  </section>
 </main>;
}
