"use client";

import {useMemo,useRef,useState} from "react";
import {validateDestinationMaster} from "./master-data-validation";

export type SheetAgenda={id:string;type:string;title:string;startsAt:string;endsAt?:string|null;timezone?:string|null;place?:string|null;address?:string|null;notes?:string|null;version:number};

const topRows=["全天","住宿"];
const hourRows=(start:number,end:number)=>Array.from({length:end-start+1},(_,index)=>`${String(start+index).padStart(2,"0")}:00`);
const dayLabel=(value:string)=>{const d=new Date(`${value}T12:00:00`);return `${d.getMonth()+1}/${d.getDate()} ${["日","一","二","三","四","五","六"][d.getDay()]}`};
const cellKey=(item:SheetAgenda)=>{if(item.type==="住宿")return "住宿";if(item.type==="全天")return "全天";return `${item.startsAt.slice(11,13)}:00`};
const typeFor=(time:string)=>time==="08:00"?"早餐":time==="12:00"||time==="13:00"?"午餐":time==="19:00"||time==="20:00"?"晚餐":time==="住宿"?"住宿":"會議";
const isSyncedTravel=(item:SheetAgenda)=>Boolean(item.notes?.startsWith("booking:"));

export default function AgendaSheet({dates,rows,onAdd,onEdit,onDelete}:{dates:string[];rows:SheetAgenda[];onAdd:(date:string,time:string)=>void;onEdit:(row:SheetAgenda)=>void;onDelete:(row:SheetAgenda)=>void}){
 const [selectedDayIndex,setSelectedDayIndex]=useState<number|null>(null),[importMessage,setImportMessage]=useState(""),[density,setDensity]=useState<"overview"|"edit">("overview"),[showFullDay,setShowFullDay]=useState(false),[scrolledX,setScrolledX]=useState(false);const fileRef=useRef<HTMLInputElement>(null),imageRef=useRef<HTMLInputElement>(null);
 const visibleDates=dates.length?dates:["2026-06-16"];
 const todayIndex=visibleDates.indexOf(new Date().toISOString().slice(0,10)),dayIndex=Math.min(selectedDayIndex??(todayIndex>=0?todayIndex:0),visibleDates.length-1);
 const hours=[...topRows,...hourRows(showFullDay?0:8,showFullDay?23:22)],hiddenTimeCount=rows.filter(row=>row.type!=="全天"&&row.type!=="住宿"&&(Number(row.startsAt.slice(11,13))<8||Number(row.startsAt.slice(11,13))>22)).length;
 const byCell=useMemo(()=>{const map=new Map<string,SheetAgenda[]>();for(const row of rows){const key=`${row.startsAt.slice(0,10)}|${cellKey(row)}`,list=map.get(key)??[];list.push(row);map.set(key,list)}return map},[rows]);
 const importFile=async(file?:File)=>{if(!file)return;const ext=file.name.split(".").pop()?.toLowerCase();if(ext!=="csv"){setImportMessage(`已接收 ${file.name}；將先轉成欄位預覽，再用公司主檔驗證後匯入。`);return}const lines=(await file.text()).split(/\r?\n/).filter(Boolean),headers=(lines.shift()??"").split(",").map(x=>x.trim().replace(/^"|"$/g,"")),rows=lines.map(line=>Object.fromEntries(line.split(",").map((value,index)=>[headers[index],value.trim().replace(/^"|"$/g,"")])));const locationRows=rows.filter(row=>row.countryCode||row.countryName||row.cityName),invalid=locationRows.filter(row=>!validateDestinationMaster({countryCode:row.countryCode,countryName:row.countryName,cityName:row.cityName}).valid);setImportMessage(invalid.length?`已讀取 ${rows.length} 列；${invalid.length} 列地點無法對應公司主檔，將進例外清單，不會直接匯入。`:`已讀取 ${rows.length} 列；主檔驗證通過，下一步預覽後再加入行程。`)};
 const imageFile=(file?:File)=>{if(!file)return;setImportMessage(`已接收 ${file.name}；截圖／PDF會先轉成表格預覽，低信心欄位需人工確認。`)};
 return <section className="agenda-sheet-wrap">
  <div className="agenda-sheet-toolbar">
   <div><b><span className="desktop-agenda-title">共同行程表</span><span className="mobile-agenda-title">今日行程</span></b><span>點空白格新增；一般活動可直接編輯，機票／住宿由原始訂單同步</span></div>
   <div className="agenda-toolbar-actions"><div className="agenda-view-toggle"><button className={density==="overview"?"on":""} onClick={()=>setDensity("overview")}>全天總覽</button><button className={density==="edit"?"on":""} onClick={()=>setDensity("edit")}>舒適編輯</button></div><button className={showFullDay?"active-time-range":""} onClick={()=>setShowFullDay(value=>!value)}>{showFullDay?"只看 08–22":`完整 24 小時${hiddenTimeCount?`（${hiddenTimeCount}）`:""}`}</button><button onClick={()=>fileRef.current?.click()}>↑ 匯入 Excel／CSV</button><button onClick={()=>imageRef.current?.click()}>▧ 讀取截圖／PDF</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>importFile(e.target.files?.[0])}/><input ref={imageRef} hidden type="file" accept="image/*,.pdf" onChange={e=>imageFile(e.target.files?.[0])}/></div>
  </div>
  {importMessage&&<div className="agenda-import-message"><span>{importMessage}</span><button onClick={()=>setImportMessage("")}>關閉</button></div>}
  <div className="agenda-mobile-days">{visibleDates.map((d,i)=><button className={i===dayIndex?"on":""} key={d} onClick={()=>setSelectedDayIndex(i)}>{dayLabel(d)}</button>)}</div>
  <div className="agenda-sheet-scrollwrap">
  {visibleDates.length>6&&!scrolledX&&<span className="sheet-scroll-more" aria-hidden="true">→ 橫向捲動看更多天</span>}
  <div className={`agenda-sheet density-${density}`} onScroll={e=>{if(e.currentTarget.scrollLeft>40)setScrolledX(true)}}>
   <div className="agenda-grid" style={{gridTemplateColumns:`76px repeat(${visibleDates.length}, minmax(154px, 1fr))`}}>
    <div className="sheet-corner">時間</div>{visibleDates.map((d,i)=><div className={`sheet-date ${i===dayIndex?"mobile-active":""}`} key={d}>{dayLabel(d)}</div>)}
    {hours.map(time=><div className="sheet-row" key={time}>
     <div className={`sheet-time ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""}`}>{time}</div>
     {visibleDates.map((date,i)=>{const items=byCell.get(`${date}|${time}`)??[];return <div className={`sheet-cell ${i===dayIndex?"mobile-active":""} ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""}`} key={`${date}-${time}`} onClick={()=>!items.length&&onAdd(date,time)}>{items.length?items.map(item=>{const synced=isSyncedTravel(item);return <article className={`sheet-event type-${item.type.replaceAll("/","-")} ${synced?"synced-travel":""}`} key={item.id} onClick={e=>{e.stopPropagation();if(!synced)onEdit(item)}}><b>{item.type==="全天"||item.type==="住宿"?item.title:`${item.startsAt.slice(11,16)} ${item.title}`}</b><span>{synced?`${item.place||item.address||item.type}・訂單同步`:item.place||item.address||item.type}</span><button aria-label={synced?"永久刪除整張訂單":"刪除"} title={synced?"永久刪除整張訂單":"刪除"} onClick={e=>{e.stopPropagation();onDelete(item)}}>×</button></article>}):<button className="sheet-add" aria-label={`${date} ${time} 新增`}>＋</button>}</div>})}
    </div>)}
   </div>
  </div>
  </div>
  <p className="agenda-sheet-tip"><span className="desktop-agenda-title">桌機可橫向看多天；「全天總覽」看全貌、「舒適編輯」放大操作。</span><span className="mobile-agenda-title">左右切換日期；全天與住宿固定顯示在最上方。</span> 機票與住宿直接來自原始訂單，不在行程表建立第二份資料。</p>
 </section>;
}

export const blankForCell=(date:string,time:string):SheetAgenda=>({id:`new-${Date.now()}`,type:typeFor(time),title:"",startsAt:`${date}T${time==="全天"||time==="住宿"?"09:00":time}`,timezone:"",place:"",version:0});
