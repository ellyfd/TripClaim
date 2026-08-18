"use client";

import {useEffect,useState} from "react";
import CreateTripForm from "./CreateTripWizardLive";
import ExpenseWizard from "./ExpenseWizardLive";
import ExpensePageBoundary from "./ExpensePageBoundary";
import ItineraryWizard from "./ItineraryWizardLive";
import TripOverview from "./TripOverview";
import TripPreparation from "./TripPreparation";
import SystemManagement from "./SystemManagement";

type Stage="create"|"overview"|"itinerary"|"preparation"|"expense";
type TripStage=Exclude<Stage,"create">;
type ActiveTrip={id:string;name:string};
type Account={displayName:string;email:string;notificationEmail:string;authenticated:boolean;role:"admin"|"member"|"finance"|"viewer"|null};
const isTripStage=(value:string|null):value is TripStage=>value==="overview"||value==="itinerary"||value==="preparation"||value==="expense";

export default function Home(){
 const [stage,setStage]=useState<Stage>("create");
 const [activeTrip,setActiveTrip]=useState<ActiveTrip|null>(null);
 const [manage,setManage]=useState<"personal"|"admin"|null>(null);
 const [toast,setToast]=useState("");
 const [account,setAccount]=useState<Account>({displayName:"Elly Cheng",email:"elly@example.com",notificationEmail:"elly@example.com",authenticated:false,role:null});

 useEffect(()=>{fetch("/api/me").then(x=>x.json()).then(x=>x?.email&&setAccount(x)).catch(()=>{})},[]);
 useEffect(()=>{let active=true;const restore=async()=>{const params=new URLSearchParams(window.location.search),tripId=params.get("trip"),target=params.get("stage");if(!tripId){if(active){setStage("create");setActiveTrip(null)}return}const response=await fetch("/api/trips");if(!response.ok)return;const trip=(await response.json()).trips?.find((item:ActiveTrip)=>item.id===tripId);if(active&&trip){setActiveTrip({id:trip.id,name:trip.name});setStage(isTripStage(target)?target:"overview")}};restore().catch(()=>null);window.addEventListener("popstate",restore);return()=>{active=false;window.removeEventListener("popstate",restore)}},[]);
 const show=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(""),2300)};
 const goTrips=()=>{setStage("create");setActiveTrip(null);window.history.pushState(null,"",window.location.pathname)};
 const openTrip=(trip:ActiveTrip,target:TripStage="overview")=>{setActiveTrip(trip);setStage(target);const url=new URL(window.location.href);url.searchParams.set("trip",trip.id);url.searchParams.set("stage",target);window.history.pushState(null,"",`${url.pathname}${url.search}`)};
 const navigate=(target:TripStage)=>activeTrip?openTrip(activeTrip,target):show("請先建立或選擇一趟出差");

 const mobileBottomNav=<nav className="mobile-nav workspace-mobile-nav" aria-label="手機工作區">
  <button className={stage==="create"?"on":""} onClick={goTrips}><i>⌂</i><span>出差</span></button>
  <button className={stage==="overview"?"on":""} aria-disabled={!activeTrip} onClick={()=>navigate("overview")}><i>◎</i><span>總覽</span></button>
  <button className={stage==="itinerary"?"on":""} aria-disabled={!activeTrip} onClick={()=>navigate("itinerary")}><i>▤</i><span>行程</span></button>
  <button className={stage==="preparation"?"on":""} aria-disabled={!activeTrip} onClick={()=>navigate("preparation")}><i>✓</i><span>準備</span></button>
  <button className={stage==="expense"?"on":""} aria-disabled={!activeTrip} onClick={()=>navigate("expense")}><i>$</i><span>報支</span></button>
 </nav>;
 const management=manage&&<SystemManagement account={account} mode={manage} onClose={()=>setManage(null)} onProfileSaved={profile=>setAccount(current=>({...current,...profile}))}/>;
 const appHeader=<header className="topbar"><div className="topbar-inner">
  <div className="brand"><span>快</span><div><b>快報</b><small>TripClaim</small></div></div>
  <nav aria-label="Trip workspace"><button className={stage==="create"?"active":""} onClick={goTrips}><i>⌂</i>全部出差</button><button disabled={!activeTrip} className={stage==="overview"?"active":""} onClick={()=>navigate("overview")}><i>1</i>總覽</button><button disabled={!activeTrip} className={stage==="itinerary"?"active":""} onClick={()=>navigate("itinerary")}><i>2</i>行程</button><button disabled={!activeTrip} className={stage==="preparation"?"active":""} onClick={()=>navigate("preparation")}><i>3</i>行前準備</button><button disabled={!activeTrip} className={stage==="expense"?"active":""} onClick={()=>navigate("expense")}><i>4</i>我的報支</button></nav>
  <div className="account-spacer"/>{account.role==="admin"&&<button className="management-trigger" onClick={()=>setManage("admin")}>管理</button>}<button className="account-menu" onClick={()=>setManage("personal")}><span className="account-name"><b>{account.displayName}</b><small>{account.authenticated?"已登入・個人資料":"示範帳號"}</small></span><span className="profile" title={account.email}>{account.displayName.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}</span></button>
 </div></header>;
 const tripContext=activeTrip&&<section className="trip-context-nav"><button className="back" onClick={goTrips}>← 全部出差</button><div><span>目前出差</span><b>{activeTrip.name}</b></div></section>;

 return <main>
  {appHeader}{tripContext}
  {stage==="create"&&<CreateTripForm onCreate={trip=>openTrip(trip,"overview")} onExpense={trip=>openTrip(trip,"expense")}/>} 
  {stage==="overview"&&activeTrip&&<TripOverview key={`overview-${activeTrip.id}`} tripId={activeTrip.id} onNavigate={navigate}/>} 
  {stage==="itinerary"&&activeTrip&&<ItineraryWizard key={`itinerary-${activeTrip.id}`} tripId={activeTrip.id}/>} 
  {stage==="preparation"&&activeTrip&&<TripPreparation key={`preparation-${activeTrip.id}`} tripId={activeTrip.id}/>} 
  {stage==="expense"&&activeTrip&&<ExpensePageBoundary key={`expense-${activeTrip.id}`} onBack={()=>navigate("overview")}><ExpenseWizard tripId={activeTrip.id}/></ExpensePageBoundary>}
  {mobileBottomNav}{management}{toast&&<div className="toast">✓ {toast}</div>}
 </main>;
}
