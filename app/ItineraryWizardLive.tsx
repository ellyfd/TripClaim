"use client";
import {useEffect,useState} from "react";
import TripTodoPanel from "./TripTodoPanel";
import AgendaSheet,{blankForCell} from "./AgendaSheet";
import CompLeavePanel from "./CompLeavePanel";
import BookingPanel from "./BookingPanel";
type Agenda={id:string;type:string;title:string;startsAt:string;endsAt?:string|null;timezone?:string|null;place?:string|null;address?:string|null;version:number};
const dateRange=(start:string,end:string)=>{const out:string[]=[];for(let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);d<=last&&out.length<31;d.setDate(d.getDate()+1))out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);return out};
export default function ItineraryWizardLive(){
 const [tripId,setTripId]=useState(""),[rows,setRows]=useState<Agenda[]>([]),[dates,setDates]=useState<string[]>([]),[editing,setEditing]=useState<string|null>(null),[status,setStatus]=useState("正在載入共同行程…");
 const load=async(id=tripId)=>{if(!id)return;const r=await fetch(`/api/trips/${id}/summary`);if(r.ok){const x=await r.json();setRows(x.agenda??[]);if(x.trip)setDates(dateRange(x.trip.startsOn,x.trip.endsOn));setStatus(x.agenda?.length?"已同步共同行程":"尚無行程，點表格空白處即可新增")}};
 useEffect(()=>{const start=async()=>{let id=sessionStorage.getItem("activeTripId")||"";if(!id){const r=await fetch("/api/trips");if(r.ok)id=(await r.json()).trips?.[0]?.id||""}if(!id){setStatus("請先建立一趟出差");return}setTripId(id);await load(id)};start().catch(()=>setStatus("載入失敗，請重新整理"))},[]);
 const update=(id:string,key:keyof Agenda,value:string)=>setRows(v=>v.map(r=>r.id===id?{...r,[key]:value}:r));
 const updateTime=(row:Agenda,key:"startsAt"|"endsAt",time:string)=>update(row.id,key,`${row.startsAt.slice(0,10)}T${time}`);
 const toggleAllDay=(row:Agenda,checked:boolean)=>setRows(v=>v.map(r=>r.id===row.id?{...r,type:checked?"全天":r.type==="全天"?"會議":r.type,endsAt:checked?null:r.endsAt}:r));
 const add=()=>{if(!tripId)return;const row=blankForCell(dates[0]??new Date().toISOString().slice(0,10),"09:00");setRows(v=>[...v,row]);setEditing(row.id)};
 const addAt=(date:string,time:string)=>{const row=blankForCell(date,time);setRows(v=>[...v,row]);setEditing(row.id)};
 const save=async(row:Agenda)=>{setStatus("正在保存…");if(row.version===0){const r=await fetch(`/api/trips/${tripId}/agenda`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(row)});if(r.ok){const x=await r.json();setRows(v=>v.map(y=>y.id===row.id?{...row,id:x.id,version:x.version}:y));setEditing(null);setStatus("已同步給所有同行者")}else setStatus("保存失敗，請重試");return}const r=await fetch(`/api/trips/${tripId}/agenda/${row.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(row)});if(r.status===409){setStatus("其他同行者剛修改這筆資料，請重新載入後再確認");return}if(r.ok){const x=await r.json();setRows(v=>v.map(y=>y.id===row.id?{...row,version:x.version}:y));setEditing(null);setStatus("已同步給所有同行者")}else setStatus("保存失敗，請重試")};
 const remove=async(row:Agenda)=>{if(!window.confirm(`確定刪除「${row.title}」？`))return;if(row.version===0){setRows(v=>v.filter(x=>x.id!==row.id));return}const r=await fetch(`/api/trips/${tripId}/agenda/${row.id}`,{method:"DELETE"});if(r.ok){setRows(v=>v.filter(x=>x.id!==row.id));setStatus("已刪除並保留復原紀錄")}else setStatus("刪除失敗，請重試")};
 return <main className="wizard-page itinerary-wizard itinerary-workspace-page">
  <section className="wizard-stage itinerary-single">
   <div className="step-heading"><span>步驟 2・共同行程</span><h1>安排行程</h1><p>所有同行者共編同一份行程；個人報帳仍各自管理。</p><button className="add-agenda" onClick={add} disabled={!tripId}>＋ 新增活動</button></div>
   <p className="sync-line">{status}</p>
   <div className="agenda-workspace"><div className="agenda-workspace-main">
   <AgendaSheet dates={dates} rows={rows} onAdd={addAt} onEdit={row=>setEditing(row.id)} onDelete={remove}/>
    {editing&&rows.filter(row=>row.id===editing).map(row=><article className="agenda-sheet-editor panel" key={row.id}><div className="agenda-edit-grid"><label className="all-day-check"><input type="checkbox" checked={row.type==="全天"} onChange={e=>toggleAllDay(row,e.target.checked)}/><span><b>全天活動</b><small>不需要填開始與結束時間</small></span></label>{row.type!=="全天"&&<><label>開始時間<input type="time" value={row.startsAt.slice(11,16)} onChange={e=>updateTime(row,"startsAt",e.target.value)}/></label><label>結束時間<input type="time" value={(row.endsAt??"").slice(11,16)} onChange={e=>updateTime(row,"endsAt",e.target.value)}/></label></>}<label className="activity-field">活動<input value={row.title} placeholder="例如：拜訪客戶、午餐" onChange={e=>update(row.id,"title",e.target.value)}/></label><label className="people-field">參與者<input value={row.place??""} placeholder="輸入姓名，可用逗號分隔" onChange={e=>update(row.id,"place",e.target.value)}/></label></div><div className="agenda-item-actions"><button disabled={!row.title.trim()} onClick={()=>save(row)}>✓ 保存</button><button onClick={()=>setEditing(null)}>取消</button><button className="delete" onClick={()=>remove(row)}>刪除</button></div></article>)}
    {tripId&&<section className="shared-booking-overview" aria-label="同行者班機與住宿"><BookingPanel tripId={tripId} mode="compare"/></section>}
   </div>{tripId&&<aside className="agenda-side" aria-label="行前個人工具"><TripTodoPanel tripId={tripId} onBookingSaved={()=>load()}/><CompLeavePanel tripId={tripId}/></aside>}</div>
  </section>
 </main>
}
