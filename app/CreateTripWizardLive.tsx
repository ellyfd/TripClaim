"use client";

import {useEffect,useMemo,useState} from "react";
import {destinations} from "./CreateTripForm";

type Stop={country:string;city:string};
type Draft={name:string;purpose:string;startsOn:string;endsOn:string;stops:Stop[];emails:string[]};
type Trip={id:string;name:string;purpose:string|null;startsOn:string;endsOn:string;status:string;updatedAt:string;progress:number;remaining:number;destinations:Array<{countryCode:string;countryName:string;cityName:string}>};

const initial:Draft={name:"",purpose:"",startsOn:"",endsOn:"",stops:[{country:"",city:""}],emails:[]};
const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const labelDate=(value:string)=>value?`${Number(value.slice(5,7))} 月 ${Number(value.slice(8,10))} 日`:"";

function SearchableSelect({value,options,placeholder,disabled,onChange}:{value:string;options:string[];placeholder:string;disabled?:boolean;onChange:(value:string)=>void}){
 const [query,setQuery]=useState(value),[open,setOpen]=useState(false);
 const filtered=options.filter(x=>x.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,80);
 const close=()=>setTimeout(()=>{setOpen(false);setQuery(value)},120);
 return <div className={`searchable-select ${disabled?"disabled":""}`}>
  <input disabled={disabled} value={query} placeholder={placeholder} autoComplete="off" onFocus={()=>setOpen(true)} onBlur={close} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onKeyDown={e=>{if(e.key==="Enter"&&filtered[0]){e.preventDefault();onChange(filtered[0]);setQuery(filtered[0]);setOpen(false)}if(e.key==="Escape"){setOpen(false);setQuery(value)}}}/>
  <span>⌄</span>
  {open&&!disabled&&<div className="searchable-options">{filtered.length?filtered.map(x=><button type="button" key={x} className={x===value?"selected":""} onMouseDown={e=>e.preventDefault()} onClick={()=>{onChange(x);setQuery(x);setOpen(false)}}>{x}</button>):<p>找不到符合的項目</p>}</div>}
 </div>
}

function DateRangePicker({start,end,onChange}:{start:string;end:string;onChange:(start:string,end:string)=>void}){
 const [open,setOpen]=useState(false);
 const [month,setMonth]=useState(()=>{const d=start?new Date(`${start}T12:00:00`):new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
 const firstDay=month.getDay(),days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const cells=Array.from({length:firstDay+days},(_,i)=>i<firstDay?null:new Date(month.getFullYear(),month.getMonth(),i-firstDay+1));
 const choose=(day:Date)=>{const value=iso(day);if(!start||end){onChange(value,"");return}if(value<start){onChange(value,"");return}onChange(start,value);setOpen(false)};
 return <div className="date-range-picker">
  <label>2. 選擇出差日期</label>
  <button type="button" className={`date-range-trigger ${open?"open":""}`} onClick={()=>setOpen(v=>!v)}>
   <span>▣</span>
   <b>{start?`${labelDate(start)}${end?` → ${labelDate(end)}`:" → 請選結束日"}`:"一次選擇開始與結束日期"}</b>
   <em>{start&&end?`${Math.round((new Date(`${end}T12:00:00`).getTime()-new Date(`${start}T12:00:00`).getTime())/86400000)+1} 天`:"點一下開啟日曆"}</em>
  </button>
  {open&&<div className="date-range-popover">
   <header><button type="button" aria-label="上個月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><strong>{month.getFullYear()} 年 {month.getMonth()+1} 月</strong><button type="button" aria-label="下個月" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></header>
   <div className="date-week">{["日","一","二","三","四","五","六"].map(x=><span key={x}>{x}</span>)}</div>
   <div className="date-grid">{cells.map((day,i)=>day?<button type="button" key={iso(day)} className={`${iso(day)===start?"start ":""}${iso(day)===end?"end ":""}${start&&end&&iso(day)>start&&iso(day)<end?"between":""}`} onClick={()=>choose(day)}>{day.getDate()}</button>:<i key={`blank-${i}`}/>)}</div>
   <p>{!start?"先選出發日":!end?"再選回程日":"日期已選好；要更改請直接點新的出發日"}</p>
  </div>}
 </div>
}

type OpenedTrip={id:string;name:string};

export default function CreateTripWizardLive({onCreate,onExpense}:{onCreate:(trip:OpenedTrip)=>void;onExpense?:(trip:OpenedTrip)=>void}){
 const countries=useMemo(()=>Object.keys(destinations).sort((a,b)=>(a.match(/[A-Z]{3}$/)?.[0]??a).localeCompare(b.match(/[A-Z]{3}$/)?.[0]??b,"en")),[]);
 const [step,setStep]=useState(1),[form,setForm]=useState(initial),[nameEdited,setNameEdited]=useState(false),[email,setEmail]=useState(""),[mode,setMode]=useState<"list"|"create"|"edit">("list"),[editingId,setEditingId]=useState("");
 const [state,setState]=useState<"loading"|"ready"|"saving"|"error">("loading"),[trips,setTrips]=useState<Trip[]>([]);
 const [errorMsg,setErrorMsg]=useState("");
 const [pendingDelete,setPendingDelete]=useState<Trip|null>(null),[deleting,setDeleting]=useState(false);
 const [hasCreateDraft,setHasCreateDraft]=useState(false),[draftAction,setDraftAction]=useState<"idle"|"saving"|"discarding">("idle");

 useEffect(()=>{Promise.all([fetch("/api/drafts?flow=create").then(r=>r.ok?r.json():null),fetch("/api/trips").then(r=>r.ok?r.json():null)]).then(([drafts,tripData])=>{if(drafts?.draft){const saved={...initial,...drafts.draft.payload};setStep(Math.min(drafts.draft.step,3));setForm(saved);setNameEdited(Boolean(saved.name));setHasCreateDraft(true)}else setHasCreateDraft(false);setTrips(tripData?.trips??[]);setState("ready")}).catch(()=>setState("ready"))},[]);
 useEffect(()=>{if(state==="loading"||state==="saving"||mode!=="create"||draftAction!=="idle")return;const timer=setTimeout(()=>fetch("/api/drafts",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({flow:"create",step,payload:form})}).then(r=>{if(r.ok)setHasCreateDraft(true)}).catch(()=>null),350);return()=>clearTimeout(timer)},[step,form,state,mode,draftAction]);

 const selectedPlaces=form.stops.map(x=>x.city.split(" ")[0]).filter(Boolean);
 const range=form.startsOn&&form.endsOn?`${form.startsOn.slice(5).replace("-","/")}–${form.endsOn.slice(5).replace("-","/")}`:"";
 const autoName=[selectedPlaces.join("・"),range,"出差"].filter(Boolean).join(" ");
 const effectiveName=nameEdited?form.name:autoName;
 const changeStop=(i:number,key:keyof Stop,value:string)=>setForm(v=>({...v,stops:v.stops.map((s,n)=>n===i?{...s,[key]:value,...(key==="country"?{city:value?(destinations[value]?.[0]??""):""}:{})}:s)}));
 const addEmail=()=>{const value=email.trim().toLowerCase();if(value&&!form.emails.includes(value))setForm(v=>({...v,emails:[...v.emails,value]}));setEmail("")};
 const openTrip=(trip:Trip,target:"itinerary"|"expense")=>{const opened={id:trip.id,name:trip.name};if(target==="expense"&&onExpense)onExpense(opened);else onCreate(opened)};
 const startNew=()=>{if(!hasCreateDraft){setForm(initial);setNameEdited(false);setEmail("");setStep(1)}setEditingId("");setErrorMsg("");setState("ready");setMode("create")};
 const editTrip=(trip:Trip)=>{setForm({name:trip.name,purpose:trip.purpose??trip.name,startsOn:trip.startsOn,endsOn:trip.endsOn,stops:trip.destinations.length?trip.destinations.map(x=>({country:`${x.countryName} ${x.countryCode}`,city:x.cityName})):[{country:"",city:""}],emails:[]});setNameEdited(true);setEditingId(trip.id);setStep(1);setErrorMsg("");setState("ready");setMode("edit")};
 const deleteTrip=async()=>{if(!pendingDelete)return;setDeleting(true);const r=await fetch(`/api/trips/${pendingDelete.id}`,{method:"DELETE"});if(r.ok){setTrips(v=>v.filter(x=>x.id!==pendingDelete.id));setPendingDelete(null)}else window.alert("只有建立者可以刪除這趟出差。");setDeleting(false)};
 const saveCreateDraft=async()=>{try{const response=await fetch("/api/drafts",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({flow:"create",step,payload:form})});if(response.ok){setHasCreateDraft(true);return true}}catch{}return false};
 const leaveWizard=async()=>{if(mode==="edit"){setMode("list");setState("ready");setErrorMsg("");return}setDraftAction("saving");const saved=await saveCreateDraft();if(saved){setState("ready");setErrorMsg("");setMode("list")}else{setState("error");setErrorMsg("草稿保存失敗，仍留在目前畫面；請確認網路後再試。")}setDraftAction("idle")};
 const abandonDraft=async()=>{if(mode!=="create"||draftAction!=="idle")return;if(!window.confirm("放棄這份建立中草稿？尚未建立的地點、日期與邀請名單會清除。"))return;setDraftAction("discarding");try{const response=await fetch("/api/drafts?flow=create",{method:"DELETE"});if(!response.ok)throw new Error("discard_failed");setHasCreateDraft(false);setForm(initial);setNameEdited(false);setEmail("");setStep(1);setState("ready");setErrorMsg("");setMode("list")}catch{setState("error");setErrorMsg("放棄草稿失敗，草稿仍保留；請確認網路後再試。")}finally{setDraftAction("idle")}};
 const firstStepReady=Boolean(effectiveName&&form.startsOn&&form.endsOn&&form.endsOn>=form.startsOn&&!form.stops.some(s=>!s.country||!s.city));
 const finish=async()=>{
  if(!firstStepReady){setState("error");setErrorMsg("請先完成地點與日期的選擇。");setStep(1);return}
  setState("saving");
  const payload={name:effectiveName,purpose:effectiveName,startsOn:form.startsOn,endsOn:form.endsOn,destinations:form.stops.map(s=>{const [countryName,countryCode]=s.country.split(/ (?=[A-Z]{3}$)/);return{countryCode,countryName,cityName:s.city}})};
  let response;
  try{response=await fetch(mode==="edit"?`/api/trips/${editingId}`:"/api/trips",{method:mode==="edit"?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)})}
  catch{setState("error");setErrorMsg("網路連線異常，資料仍保留，請確認網路後重試。");return}
  if(!response.ok){setState("error");setErrorMsg(response.status===401?"登入狀態已失效，請重新整理頁面後再試。":response.status>=500?"系統暫時無法保存（不是資料填寫問題），請稍後再試；若持續發生請聯絡管理員。":"保存失敗，請檢查欄位內容後重試。");return}
  const result=await response.json(),id=mode==="edit"?editingId:result.id;
  if(mode!=="edit"){
   for(const memberEmail of form.emails)await fetch(`/api/trips/${id}/members`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:memberEmail,role:"member"})});
   await fetch("/api/drafts?flow=create",{method:"DELETE"}).catch(()=>null);setHasCreateDraft(false);
  }
  setState("ready");onCreate({id,name:effectiveName});
 };

 if(mode==="list")return <section className="my-trips-page">
  <header className="my-trips-head"><div><span>我的出差</span><h1>全部出差</h1><p>從這裡查看進度、繼續安排行程或處理自己的報支。</p></div><div><strong>{trips.length}</strong><small>趟出差</small><button onClick={startNew}>{hasCreateDraft?"繼續建立草稿":"＋ 建立新出差"}</button></div></header>
  {state==="loading"?<div className="trips-empty panel">正在載入我的出差…</div>:trips.length===0?<div className="trips-empty panel"><h2>還沒有出差</h2><p>建立第一趟後，行程、機票、住宿與報支進度都會集中在這裡。</p><button onClick={startNew}>{hasCreateDraft?"繼續建立草稿":"建立新出差"}</button></div>:<div className="my-trips-list">{trips.map(t=><article className="my-trip-row panel" key={t.id}><div className="trip-date"><b>{t.startsOn.slice(5).replace("-","/")}</b><span>至 {t.endsOn.slice(5).replace("-","/")}</span></div><div className="trip-main"><em>{t.status==="draft"?"規劃中":"進行中"}</em><h2>{t.name}</h2><p>{t.destinations.map(x=>x.cityName).join(" → ")||"地點待確認"}</p></div><div className="trip-progress"><div><span>我的進度</span><b>{t.progress}%</b></div><i><em style={{width:`${t.progress}%`}}/></i><small>{t.remaining?`還有 ${t.remaining} 項待完成`:"已完成"}</small></div><div className="trip-row-actions"><button className="open" onClick={()=>openTrip(t,"itinerary")}>行程</button><button className="claim" onClick={()=>openTrip(t,"expense")}>我的報支</button><details className="trip-more"><summary aria-label="更多操作">⋯</summary><div className="trip-more-popover"><button onClick={()=>editTrip(t)}><span aria-hidden="true">✎</span>編輯</button><button className="delete" onClick={()=>setPendingDelete(t)}><span aria-hidden="true">🗑︎</span>刪除</button></div></details></div></article>)}</div>}
  {pendingDelete&&<div className="trip-delete-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!deleting)setPendingDelete(null)}}><section className="trip-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-trip-title"><span className="trash-mark" aria-hidden="true">🗑︎</span><h2 id="delete-trip-title">刪除這趟出差？</h2><p>「{pendingDelete.name}」的行程與相關資料將移至封存。這個動作不會直接永久清除資料。</p><div><button disabled={deleting} onClick={()=>setPendingDelete(null)}>取消</button><button className="confirm-delete" disabled={deleting} onClick={deleteTrip}>{deleting?"正在刪除…":"刪除出差"}</button></div></section></div>}
 </section>;
 return <>
  <section className="wizard-shell">
   <div className="wizard-exit-actions"><button className="back-to-trips" disabled={state==="saving"||draftAction!=="idle"} onClick={()=>void leaveWizard()}>{mode==="edit"?"← 取消編輯並返回":"← 儲存草稿並離開"}</button>{mode==="create"&&<button className="discard-draft" disabled={state==="saving"||draftAction!=="idle"} onClick={()=>void abandonDraft()}>{draftAction==="discarding"?"正在放棄…":"放棄草稿"}</button>}</div>
   <div className="wizard-progress three-steps">{["地點、日期與名稱","邀請成員","確認建立"].map((x,i)=><div className={step===i+1?"active":step>i+1?"done":""} key={x}><i>{step>i+1?"✓":i+1}</i><span>{x}</span></div>)}</div>
   <div className="create-card panel wizard-card">{state==="loading"?<div className="wizard-loading">正在載入上次草稿…</div>:<>
    {step===1&&<>
     <div><h2>{mode==="edit"?"編輯出差":"建立新出差"}</h2><p>先選地點，再選日期；系統會自動產生出差名稱。</p>{mode==="create"&&<small className="draft-lifecycle-note">建立中會自動保存；離開時會再次確認草稿已寫入伺服器。</small>}</div>
     <div className="merged-destination"><h3>1. 選擇國家與城市</h3><div className="destination-list">{form.stops.map((s,i)=><div className="destination-stop" key={i}><b>目的地 {i+1}</b><button onClick={()=>setForm(v=>({...v,stops:v.stops.filter((_,n)=>n!==i)}))} disabled={form.stops.length===1}>移除</button><label>國家<SearchableSelect key={`country-${i}-${s.country}`} value={s.country} options={countries} placeholder="輸入國名或代碼搜尋" onChange={value=>changeStop(i,"country",value)}/></label><label>城市<SearchableSelect key={`city-${i}-${s.country}-${s.city}`} value={s.city} options={s.country?(destinations[s.country]??[]):[]} placeholder={s.country?"輸入城市搜尋":"請先選國家"} disabled={!s.country} onChange={value=>changeStop(i,"city",value)}/></label></div>)}</div><button className="add-destination" onClick={()=>setForm(v=>({...v,stops:[...v.stops,{country:"",city:""}]}))}>＋ 新增另一個國家／城市</button></div>
     <DateRangePicker start={form.startsOn} end={form.endsOn} onChange={(startsOn,endsOn)=>setForm(v=>({...v,startsOn,endsOn}))}/>
     <label className="auto-name-field">3. 出差名稱 <small>已依地點與日期自動產生，可自行修改</small><input value={effectiveName} placeholder="選好地點與日期後自動產生" onChange={e=>{setNameEdited(true);setForm(v=>({...v,name:e.target.value}))}}/></label>
    </>}
    {step===2&&<><div><h2>{mode==="edit"?"確認同行設定":"邀請同行者"}</h2><p>所有成員都能編輯行程；個人報支仍彼此隔離。</p></div>{mode==="edit"?<p className="edit-member-note">既有同行者不會因修改基本資料而被移除；要新增同行者可進入行程後操作。</p>:<><div className="invite-row"><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="同行者 Email" type="email"/><button onClick={addEmail}>加入</button></div><div className="invite-list">{form.emails.length?form.emails.map(x=><p key={x}><span>{x}</span><button onClick={()=>setForm(v=>({...v,emails:v.emails.filter(y=>y!==x)}))}>移除</button></p>):<small>可先略過，之後仍可邀請。</small>}</div></>}</>}
    {step===3&&<><div><h2>{mode==="edit"?"確認修改":"確認並建立"}</h2><p>{mode==="edit"?"儲存後回到這趟行程。":"建立後進入行程；班機與住宿可由每人各自上傳。"}</p></div><div className="wizard-summary"><b>{effectiveName}</b><span>{form.startsOn} → {form.endsOn}</span><span>{form.stops.map(x=>x.city).join(" → ")}</span>{mode!=="edit"&&<span>{form.emails.length} 位受邀同行者</span>}</div>{state==="error"&&<p className="form-error">{errorMsg||"保存失敗，資料仍保留，請重新嘗試。"}</p>}</>}
    {state==="error"&&step!==3&&<p className="form-error">{errorMsg||"操作失敗，資料仍保留，請重新嘗試。"}</p>}
    <div className="wizard-footer"><button onClick={()=>setStep(v=>Math.max(1,v-1))} disabled={step===1||state==="saving"||draftAction!=="idle"}>← 上一頁</button>{step<3?<button className="next-page" disabled={(step===1&&!firstStepReady)||state==="saving"||draftAction!=="idle"} onClick={()=>setStep(v=>v+1)}>下一頁 →</button>:<button className="next-page" disabled={state==="saving"||draftAction!=="idle"} onClick={finish}>{state==="saving"?"正在保存…":mode==="edit"?"儲存修改並進入行程 →":"建立並前往安排行程 →"}</button>}</div>
   </>}</div>
  </section>
 </>;
}
