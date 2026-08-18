"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import TripTodoPanel from "./TripTodoPanel";
import AgendaSheet,{blankForCell} from "./AgendaSheet";
import CompLeavePanel from "./CompLeavePanel";
import BookingPanel from "./BookingPanel";
type Agenda={id:string;type:string;title:string;startsAt:string;endsAt?:string|null;timezone?:string|null;place?:string|null;address?:string|null;notes?:string|null;version:number};
const dateRange=(start:string,end:string)=>{const out:string[]=[];for(let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);d<=last&&out.length<31;d.setDate(d.getDate()+1))out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);return out};
const isSyncedTravel=(row:Agenda)=>Boolean(row.notes?.startsWith("booking:"));
export default function ItineraryWizardLive({tripId}:{tripId:string}){
 const [rows,setRows]=useState<Agenda[]>([]),[dates,setDates]=useState<string[]>([]),[draft,setDraft]=useState<Agenda|null>(null),[status,setStatus]=useState("正在載入共同行程…");
 const requestSeq=useRef(0);
 const load=useCallback(async(id:string)=>{if(!id)return false;const seq=++requestSeq.current;setStatus("正在載入共同行程…");try{const r=await fetch(`/api/trips/${id}/summary`);if(!r.ok)throw new Error("load_failed");const x=await r.json();if(seq!==requestSeq.current)return false;setRows(x.agenda??[]);setDates(x.trip?dateRange(x.trip.startsOn,x.trip.endsOn):[]);setStatus(x.agenda?.length?"已同步共同行程":"尚無行程，點表格空白處即可新增");return true}catch{if(seq!==requestSeq.current)return false;setRows([]);setDates([]);setStatus("載入失敗，請重新整理");return false}},[]);
 useEffect(()=>{setRows([]);setDates([]);setDraft(null);void load(tripId);return()=>{requestSeq.current++}},[tripId,load]);
 const updateDraft=(key:keyof Agenda,value:string)=>setDraft(row=>row?{...row,[key]:value}:row);
 const updateTime=(row:Agenda,key:"startsAt"|"endsAt",time:string)=>updateDraft(key,`${row.startsAt.slice(0,10)}T${time}`);
 const toggleAllDay=(row:Agenda,checked:boolean)=>setDraft({...row,type:checked?"全天":row.type==="全天"?"會議":row.type,endsAt:checked?null:row.endsAt});
 const add=()=>{if(!tripId)return;setDraft(blankForCell(dates[0]??new Date().toISOString().slice(0,10),"09:00"));setStatus("尚未儲存；完成資料後按保存")};
 const addAt=(date:string,time:string)=>{setDraft(blankForCell(date,time));setStatus("尚未儲存；完成資料後按保存")};
 const edit=(row:Agenda)=>{if(isSyncedTravel(row)){setStatus("機票與住宿由原始訂單同步，請從訂單資料修改");return}setDraft({...row});setStatus("正在編輯；按保存後才會同步給同行者")};
 const cancelDraft=()=>{setDraft(null);setStatus(rows.length?"已同步共同行程":"尚無行程，點表格空白處即可新增")};
 const save=async(row:Agenda)=>{if(isSyncedTravel(row)){setDraft(null);setStatus("機票與住宿由原始訂單同步，請從訂單資料修改");return}setStatus("正在保存…");if(row.version===0){const r=await fetch(`/api/trips/${tripId}/agenda`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(row)});if(!r.ok){setStatus("保存失敗，未儲存內容仍保留在編輯區；請重試");return}setDraft(null);const confirmed=await load(tripId);setStatus(confirmed?"已由伺服器確認並同步給所有同行者":"活動已送出，但重新讀取失敗；請重新整理確認");return}const r=await fetch(`/api/trips/${tripId}/agenda/${row.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(row)});if(r.status===409){const x=await r.json().catch(()=>null);setStatus(x?.error==="managed_travel_item"?"機票與住宿由原始訂單同步，請從訂單資料修改":"其他同行者剛修改這筆資料，未覆蓋對方版本；請重新載入後再確認");return}if(!r.ok){setStatus("保存失敗，未儲存修改仍保留在編輯區；請重試或取消");return}setDraft(null);const confirmed=await load(tripId);setStatus(confirmed?"已由伺服器確認並同步給所有同行者":"修改已送出，但重新讀取失敗；請重新整理確認")};
 const remove=async(row:Agenda)=>{const travel=isSyncedTravel(row);if(!window.confirm(travel?`確定永久刪除「${row.title}」所屬的整張機票／住宿訂單？同張訂單的所有航段、附件與本人待報支會一起刪除，且無法復原。`:`確定刪除「${row.title}」？`))return;const r=await fetch(`/api/trips/${tripId}/agenda/${row.id}`,{method:"DELETE"});const result=await r.json().catch(()=>null);if(r.ok){setDraft(current=>current?.id===row.id?null:current);window.dispatchEvent(new Event("tripclaim:data-changed"));await load(tripId);setStatus(result?.travelOrder?`已永久刪除整張訂單（${result.bookingsDeleted??1} 段）`:"已刪除並保留復原紀錄")}else if(r.status===403&&result?.error==="travel_booking_owner_only")setStatus("這是同行者的機票／住宿，只有訂單本人可以刪除");else setStatus(result?.message||"刪除失敗，請重試")};
 return <main className="wizard-page itinerary-wizard itinerary-workspace-page">
  <section className="wizard-stage itinerary-single">
   <div className="step-heading"><span>步驟 2・共同行程</span><h1>安排行程</h1><p>所有同行者共編同一份行程；個人報帳仍各自管理。</p><button className="add-agenda" onClick={add} disabled={!tripId||!dates.length}>＋ 新增活動</button></div>
   <p className="sync-line" role="status" aria-live="polite">{status}</p>
   <div className="agenda-workspace"><div className="agenda-workspace-main">
   <AgendaSheet dates={dates} rows={rows} onAdd={addAt} onEdit={edit} onDelete={remove}/>
    {draft&&!isSyncedTravel(draft)&&<article className="agenda-sheet-editor panel" key={`${draft.id}-${draft.version}`}><div className="agenda-edit-grid"><label className="all-day-check"><input type="checkbox" checked={draft.type==="全天"} onChange={e=>toggleAllDay(draft,e.target.checked)}/><span><b>全天活動</b><small>不需要填開始與結束時間</small></span></label>{draft.type!=="全天"&&<><label>開始時間<input type="time" value={draft.startsAt.slice(11,16)} onChange={e=>updateTime(draft,"startsAt",e.target.value)}/></label><label>結束時間<input type="time" value={(draft.endsAt??"").slice(11,16)} onChange={e=>updateTime(draft,"endsAt",e.target.value)}/></label></>}<label className="activity-field">活動<input value={draft.title} placeholder="例如：拜訪客戶、午餐" onChange={e=>updateDraft("title",e.target.value)}/></label><label className="people-field">參與者<input value={draft.place??""} placeholder="輸入姓名，可用逗號分隔" onChange={e=>updateDraft("place",e.target.value)}/></label></div><div className="agenda-item-actions"><button disabled={!draft.title.trim()} onClick={()=>save(draft)}>✓ 保存</button><button onClick={cancelDraft}>取消</button>{draft.version>0&&<button className="delete" onClick={()=>remove(draft)}>刪除</button>}</div></article>}
    {tripId&&<section className="shared-booking-overview" aria-label="同行者班機與住宿"><BookingPanel tripId={tripId}/></section>}
   </div>{tripId&&<aside className="agenda-side" aria-label="行前個人工具"><TripTodoPanel tripId={tripId} onBookingSaved={()=>load(tripId)}/><CompLeavePanel tripId={tripId}/></aside>}</div>
  </section>
 </main>
}
