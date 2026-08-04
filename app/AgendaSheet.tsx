"use client";

import {useMemo,useRef,useState} from "react";

export type SheetAgenda={id:string;type:string;title:string;startsAt:string;endsAt?:string|null;timezone?:string|null;place?:string|null;address?:string|null;version:number};

const topRows=["全天","住宿"];
const hourRows=(start:number,end:number)=>Array.from({length:end-start+1},(_,index)=>`${String(start+index).padStart(2,"0")}:00`);
const dayLabel=(value:string)=>{const d=new Date(`${value}T12:00:00`);return `${d.getMonth()+1}/${d.getDate()} ${["日","一","二","三","四","五","六"][d.getDay()]}`};
const cellKey=(item:SheetAgenda)=>{if(item.type==="住宿")return "住宿";if(item.type==="全天")return "全天";return `${item.startsAt.slice(11,13)}:00`};
const typeFor=(time:string)=>time==="08:00"?"早餐":time==="12:00"||time==="13:00"?"午餐":time==="19:00"||time==="20:00"?"晚餐":time==="住宿"?"住宿":"會議";

export default function AgendaSheet({dates,rows,onAdd,onEdit,onDelete}:{dates:string[];rows:SheetAgenda[];onAdd:(date:string,time:string)=>void;onEdit:(row:SheetAgenda)=>void;onDelete:(row:SheetAgenda)=>void}){
 const [dayIndex,setDayIndex]=useState(0),[importMessage,setImportMessage]=useState(""),[density,setDensity]=useState<"overview"|"edit">("overview"),[showFullDay,setShowFullDay]=useState(false);const fileRef=useRef<HTMLInputElement>(null),imageRef=useRef<HTMLInputElement>(null);
 const visibleDates=dates.length?dates:["2026-06-16"];
 const hours=[...topRows,...hourRows(showFullDay?0:8,showFullDay?23:22)],hiddenTimeCount=rows.filter(row=>row.type!=="全天"&&row.type!=="住宿"&&(Number(row.startsAt.slice(11,13))<8||Number(row.startsAt.slice(11,13))>22)).length;
 const byCell=useMemo(()=>{const map=new Map<string,SheetAgenda[]>();for(const row of rows){const key=`${row.startsAt.slice(0,10)}|${cellKey(row)}`,list=map.get(key)??[];list.push(row);map.set(key,list)}return map},[rows]);
 const importFile=(file?:File)=>{if(!file)return;const ext=file.name.split(".").pop()?.toLowerCase();setImportMessage(ext==="csv"?`已讀取 ${file.name}；下一步將預覽欄位對應後才加入行程。`:`已接收 ${file.name}；將辨識日期、時間與內容，確認後再匯入。`)};
 const imageFile=(file?:File)=>{if(!file)return;setImportMessage(`已接收 ${file.name}；截圖／PDF會先轉成表格預覽，低信心欄位需人工確認。`)};
 return <section className="agenda-sheet-wrap">
  <div className="agenda-sheet-toolbar">
   <div><b>共同行程表</b><span>點空白格新增；點內容編輯或刪除</span></div>
   <div className="agenda-toolbar-actions"><div className="agenda-view-toggle"><button className={density==="overview"?"on":""} onClick={()=>setDensity("overview")}>全天總覽</button><button className={density==="edit"?"on":""} onClick={()=>setDensity("edit")}>舒適編輯</button></div><button className={showFullDay?"active-time-range":""} onClick={()=>setShowFullDay(value=>!value)}>{showFullDay?"只看 08–22":`完整 24 小時${hiddenTimeCount?`（${hiddenTimeCount}）`:""}`}</button><button onClick={()=>fileRef.current?.click()}>↑ 匯入 Excel／CSV</button><button onClick={()=>imageRef.current?.click()}>▧ 讀取截圖／PDF</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>importFile(e.target.files?.[0])}/><input ref={imageRef} hidden type="file" accept="image/*,.pdf" onChange={e=>imageFile(e.target.files?.[0])}/></div>
  </div>
  {importMessage&&<div className="agenda-import-message"><span>{importMessage}</span><button onClick={()=>setImportMessage("")}>關閉</button></div>}
  <div className="agenda-mobile-days">{visibleDates.map((d,i)=><button className={i===dayIndex?"on":""} key={d} onClick={()=>setDayIndex(i)}>{dayLabel(d)}</button>)}</div>
  <div className={`agenda-sheet density-${density}`}>
   <div className="agenda-grid" style={{gridTemplateColumns:`76px repeat(${visibleDates.length}, minmax(154px, 1fr))`}}>
    <div className="sheet-corner">時間</div>{visibleDates.map((d,i)=><div className={`sheet-date ${i===dayIndex?"mobile-active":""}`} key={d}>{dayLabel(d)}</div>)}
    {hours.map(time=><div className="sheet-row" key={time}>
     <div className={`sheet-time ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""}`}>{time}</div>
     {visibleDates.map((date,i)=>{const items=byCell.get(`${date}|${time}`)??[];return <div className={`sheet-cell ${i===dayIndex?"mobile-active":""} ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""}`} key={`${date}-${time}`} onClick={()=>!items.length&&onAdd(date,time)}>{items.length?items.map(item=><article className={`sheet-event type-${item.type.replaceAll("/","-")}`} key={item.id} onClick={e=>{e.stopPropagation();onEdit(item)}}><b>{item.type==="全天"||item.type==="住宿"?item.title:`${item.startsAt.slice(11,16)} ${item.title}`}</b><span>{item.place||item.address||item.type}</span><button aria-label="刪除" onClick={e=>{e.stopPropagation();onDelete(item)}}>×</button></article>):<button className="sheet-add" aria-label={`${date} ${time} 新增`}>＋</button>}</div>})}
    </div>)}
   </div>
  </div>
  <p className="agenda-sheet-tip">桌機可橫向看多天；「全天總覽」看全貌、「舒適編輯」放大操作。機票、住宿與個人待辦集中在表格下方。</p>
 </section>;
}

export const blankForCell=(date:string,time:string):SheetAgenda=>({id:`new-${Date.now()}`,type:typeFor(time),title:"",startsAt:`${date}T${time==="全天"||time==="住宿"?"09:00":time}`,timezone:"",place:"",version:0});
