"use client";

import {useEffect,useState} from "react";
import CreateTripForm from "./CreateTripWizardLive";
import ExpenseWizard from "./ExpenseWizardLive";
import ExpensePageBoundary from "./ExpensePageBoundary";
import ItineraryWizard from "./ItineraryWizardLive";
import SystemManagement from "./SystemManagement";

type Stage="create"|"itinerary"|"expense";
type ActiveTrip={id:string;name:string};
type Account={displayName:string;email:string;notificationEmail:string;authenticated:boolean};

export default function Home(){
 const [stage,setStage]=useState<Stage>("create");
 const [activeTrip,setActiveTrip]=useState<ActiveTrip|null>(null);
 const [manage,setManage]=useState<"personal"|"admin"|null>(null);
 const [toast,setToast]=useState("");
 const [account,setAccount]=useState<Account>({displayName:"Elly Cheng",email:"elly@example.com",notificationEmail:"elly@example.com",authenticated:false});

 useEffect(()=>{fetch("/api/me").then(x=>x.json()).then(x=>x?.email&&setAccount({...x,authenticated:true})).catch(()=>{})},[]);
 useEffect(()=>{let active=true;const restore=async()=>{const params=new URLSearchParams(window.location.search),tripId=params.get("trip"),target=params.get("stage");if(!tripId||(target!=="itinerary"&&target!=="expense")){if(active){setStage("create");setActiveTrip(null)}return}const response=await fetch("/api/trips");if(!response.ok)return;const trip=(await response.json()).trips?.find((item:ActiveTrip)=>item.id===tripId);if(active&&trip){setActiveTrip({id:trip.id,name:trip.name});setStage(target)}};restore().catch(()=>null);window.addEventListener("popstate",restore);return()=>{active=false;window.removeEventListener("popstate",restore)}},[]);
 const show=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2300)};
 const goTrips=()=>{setStage("create");setActiveTrip(null);window.history.pushState(null,"",window.location.pathname)};
 const openTrip=(trip:ActiveTrip,target:"itinerary"|"expense")=>{setActiveTrip(trip);setStage(target);const url=new URL(window.location.href);url.searchParams.set("trip",trip.id);url.searchParams.set("stage",target);window.history.pushState(null,"",`${url.pathname}${url.search}`)};
 const needsTrip=(action:()=>void)=>activeTrip?action():show("請先建立或選擇一趟出差");
 const scrollExpense=(selector:string)=>{if(activeTrip)openTrip(activeTrip,"expense");window.setTimeout(()=>document.querySelector(selector)?.scrollIntoView({behavior:"smooth",block:"start"}),80)};

 const mobileBottomNav=<nav className="mobile-nav" aria-label="手機主要功能">
  <button className={stage==="create"?"on":""} onClick={goTrips}><i>⌂</i><span>出差</span></button>
  <button className={stage==="itinerary"?"on":""} aria-disabled={!activeTrip} onClick={()=>needsTrip(()=>openTrip(activeTrip!,"itinerary"))}><i>▤</i><span>今日</span></button>
  <button className="camera" aria-disabled={!activeTrip} onClick={()=>needsTrip(()=>{openTrip(activeTrip!,"expense");window.setTimeout(()=>window.dispatchEvent(new Event("tripclaim:upload")),80)})}><i>＋</i><span>上傳</span></button>
  <button aria-disabled={!activeTrip} onClick={()=>needsTrip(()=>scrollExpense(".missing-live"))}><i>!</i><span>待辦</span></button>
  <button onClick={()=>setManage("personal")}><i>●</i><span>我的</span></button>
 </nav>;
 const management=manage&&<SystemManagement account={account} mode={manage} onClose={()=>setManage(null)} onProfileSaved={profile=>setAccount(current=>({...current,...profile}))}/>;
 const appHeader=<header className="topbar"><div className="topbar-inner">
  <div className="brand"><span>快</span><div><b>快報</b><small>TripClaim</small></div></div>
  <nav aria-label="主要流程"><button className={stage==="create"?"active":""} onClick={goTrips}><i>1</i>我的出差</button><button disabled={!activeTrip} className={stage==="itinerary"?"active":""} onClick={()=>activeTrip&&openTrip(activeTrip,"itinerary")}><i>2</i>共同行程</button><button disabled={!activeTrip} className={stage==="expense"?"active":""} onClick={()=>activeTrip&&openTrip(activeTrip,"expense")}><i>3</i>我的報帳</button></nav>
  <div className="account-spacer"/><button className="management-trigger" onClick={()=>setManage("admin")}>管理</button><button className="account-menu" onClick={()=>setManage("personal")}><span className="account-name"><b>{account.displayName}</b><small>{account.authenticated?"已登入・個人資料":"示範帳號"}</small></span><span className="profile" title={account.email}>{account.displayName.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}</span></button>
 </div></header>;
 const tripContext=activeTrip&&<section className="trip-context-nav"><button className="back" onClick={goTrips}>← 全部出差</button><div><span>目前出差</span><b>{activeTrip.name}</b></div></section>;

 return <main>
  {appHeader}{tripContext}
  {stage==="create"&&(
   <CreateTripForm onCreate={trip=>openTrip(trip,"itinerary")} onExpense={trip=>openTrip(trip,"expense")}/>
  )}
  {stage==="itinerary"&&activeTrip&&<ItineraryWizard tripId={activeTrip.id}/>}
  {stage==="expense"&&activeTrip&&<ExpensePageBoundary onBack={()=>openTrip(activeTrip,"itinerary")}><ExpenseWizard tripId={activeTrip.id}/></ExpensePageBoundary>}
  {mobileBottomNav}{management}{toast&&<div className="toast">✓ {toast}</div>}
 </main>;
}
