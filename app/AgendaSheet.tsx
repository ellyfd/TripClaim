"use client";

import {useMemo,useRef,useState} from "react";
import {validateDestinationMaster} from "./master-data-validation";
import {buildFlightSegments,isSyncedFlight} from "./agenda-flight-layout.js";
import {flightTiming,formatDurationMinutes,formatTimezoneDifference,formatUtcOffset,utcOffsetMinutes} from "./timezone-utils";

export type SheetAgenda={id:string;type:string;title:string;startsAt:string;endsAt?:string|null;timezone?:string|null;place?:string|null;address?:string|null;notes?:string|null;version:number;departureTimezone?:string|null;departureUtcAt?:string|null;arrivalTimezone?:string|null;arrivalUtcAt?:string|null;origin?:string|null;destination?:string|null};

const topRows=["全天","住宿"];
const hourRows=(start:number,end:number)=>Array.from({length:end-start+1},(_,index)=>`${String(start+index).padStart(2,"0")}:00`);
const dayLabel=(value:string)=>{const d=new Date(`${value}T12:00:00`);return `${d.getMonth()+1}/${d.getDate()} ${["日","一","二","三","四","五","六"][d.getDay()]}`};
const cellKey=(item:SheetAgenda)=>{if(item.type==="住宿")return "住宿";if(item.type==="全天")return "全天";return `${item.startsAt.slice(11,13)}:00`};
const typeFor=(time:string)=>time==="08:00"?"早餐":time==="12:00"||time==="13:00"?"午餐":time==="19:00"||time==="20:00"?"晚餐":time==="住宿"?"住宿":"會議";
const isSyncedTravel=(item:SheetAgenda)=>Boolean(item.notes?.startsWith("booking:"));
const renderedDayLimit=7;
const showFullDay=true;
const flightMeta=(item:SheetAgenda)=>{
 if(item.departureUtcAt&&item.arrivalUtcAt&&item.departureTimezone&&item.arrivalTimezone){const durationMinutes=Math.round((Date.parse(item.arrivalUtcAt)-Date.parse(item.departureUtcAt))/60000),departureOffset=utcOffsetMinutes(item.departureUtcAt,item.departureTimezone),arrivalOffset=utcOffsetMinutes(item.arrivalUtcAt,item.arrivalTimezone);if(durationMinutes>0&&departureOffset!==null&&arrivalOffset!==null)return {durationMinutes,departureOffset,arrivalOffset,difference:arrivalOffset-departureOffset}}
 if(item.endsAt&&item.departureTimezone&&item.arrivalTimezone){const timing=flightTiming({departureLocalAt:item.startsAt,departureTimezone:item.departureTimezone,arrivalLocalAt:item.endsAt,arrivalTimezone:item.arrivalTimezone});if(timing)return {durationMinutes:timing.durationMinutes,departureOffset:timing.departureOffsetMinutes,arrivalOffset:timing.arrivalOffsetMinutes,difference:timing.timezoneDifferenceMinutes}}
 return null;
};

export default function AgendaSheet({dates,rows,onAdd,onEdit,onDelete}:{dates:string[];rows:SheetAgenda[];onAdd:(date:string,time:string)=>void;onEdit:(row:SheetAgenda)=>void;onDelete:(row:SheetAgenda)=>void}){
 const [selectedDayIndex,setSelectedDayIndex]=useState<number|null>(null),[importMessage,setImportMessage]=useState(""),[scrolledX,setScrolledX]=useState(false);const fileRef=useRef<HTMLInputElement>(null),imageRef=useRef<HTMLInputElement>(null);
 const visibleDates=dates;
 const todayIndex=visibleDates.indexOf(new Date().toISOString().slice(0,10)),dayIndex=visibleDates.length?Math.min(selectedDayIndex??(todayIndex>=0?todayIndex:0),visibleDates.length-1):0;
 const windowStart=Math.floor(dayIndex/renderedDayLimit)*renderedDayLimit,renderDates=visibleDates.slice(windowStart,windowStart+renderedDayLimit),hasPreviousWindow=windowStart>0,hasNextWindow=windowStart+renderedDayLimit<visibleDates.length;
 const hours=[...topRows,...hourRows(showFullDay?0:8,showFullDay?23:22)];
 const flightSegmentsByCell=useMemo(()=>buildFlightSegments(visibleDates,rows),[visibleDates,rows]);
 const byCell=useMemo(()=>{const map=new Map<string,SheetAgenda[]>();for(const row of rows){if(isSyncedFlight(row))continue;const key=`${row.startsAt.slice(0,10)}|${cellKey(row)}`,list=map.get(key)??[];list.push(row);map.set(key,list)}return map},[rows]);
 const jumpWindow=(direction:-1|1)=>{const target=Math.max(0,Math.min(visibleDates.length-1,windowStart+direction*renderedDayLimit));setSelectedDayIndex(target);setScrolledX(false)};
 const importFile=async(file?:File)=>{if(!file)return;const ext=file.name.split(".").pop()?.toLowerCase();if(ext!=="csv"){setImportMessage(`已接收 ${file.name}；將先轉成欄位預覽，再用公司主檔驗證後匯入。`);return}const lines=(await file.text()).split(/\r?\n/).filter(Boolean),headers=(lines.shift()??"").split(",").map(x=>x.trim().replace(/^"|"$/g,"")),rows=lines.map(line=>Object.fromEntries(line.split(",").map((value,index)=>[headers[index],value.trim().replace(/^"|"$/g,"")])));const locationRows=rows.filter(row=>row.countryCode||row.countryName||row.cityName),invalid=locationRows.filter(row=>!validateDestinationMaster({countryCode:row.countryCode,countryName:row.countryName,cityName:row.cityName}).valid);setImportMessage(invalid.length?`已讀取 ${rows.length} 列；${invalid.length} 列地點無法對應公司主檔，將進例外清單，不會直接匯入。`:`已讀取 ${rows.length} 列；主檔驗證通過，下一步預覽後再加入行程。`)};
 const imageFile=(file?:File)=>{if(!file)return;setImportMessage(`已接收 ${file.name}；截圖／PDF會先轉成表格預覽，低信心欄位需人工確認。`)};
 if(!visibleDates.length)return <section className="agenda-sheet-wrap"><div className="panel" role="status" aria-live="polite"><b>正在載入這趟出差的行程</b><p>取得正確的出差日期前，不顯示其他旅程或預設日期。</p></div></section>;
 return <section className="agenda-sheet-wrap">
  <div className="agenda-sheet-toolbar">
   <div><b><span className="desktop-agenda-title">共同行程表</span><span className="mobile-agenda-title">今日行程</span></b><span>固定顯示 00:00–23:00；一般活動可直接編輯，機票／住宿由原始訂單同步</span></div>
   <div className="agenda-toolbar-actions"><div className="agenda-view-toggle" aria-label="顯示範圍"><button type="button" className="on" aria-pressed="true">完整 24 小時</button></div><button onClick={()=>fileRef.current?.click()}>↑ 匯入 Excel／CSV</button><button onClick={()=>imageRef.current?.click()}>▧ 讀取截圖／PDF</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>importFile(e.target.files?.[0])}/><input ref={imageRef} hidden type="file" accept="image/*,.pdf" onChange={e=>imageFile(e.target.files?.[0])}/></div>
  </div>
  {visibleDates.length>renderedDayLimit&&<div className="agenda-window-nav" aria-label="長行程日期區段"><button disabled={!hasPreviousWindow} onClick={()=>jumpWindow(-1)}>← 前 7 天</button><span>顯示第 {windowStart+1}–{windowStart+renderDates.length} 天，共 {visibleDates.length} 天</span><button disabled={!hasNextWindow} onClick={()=>jumpWindow(1)}>後 7 天 →</button></div>}
  {importMessage&&<div className="agenda-import-message"><span>{importMessage}</span><button onClick={()=>setImportMessage("")}>關閉</button></div>}
  <div className="agenda-mobile-days">{visibleDates.map((d,i)=><button className={i===dayIndex?"on":""} key={d} onClick={()=>{setSelectedDayIndex(i);setScrolledX(false)}}>{dayLabel(d)}</button>)}</div>
  <div className="agenda-sheet-scrollwrap">
  {renderDates.length>4&&!scrolledX&&<span className="sheet-scroll-more" aria-hidden="true">→ 橫向捲動看此段更多天</span>}
  <div className="agenda-sheet density-overview" onScroll={e=>{if(e.currentTarget.scrollLeft>40)setScrolledX(true)}}>
   <div className="agenda-grid" style={{gridTemplateColumns:`76px repeat(${renderDates.length}, minmax(154px, 1fr))`}}>
    <div className="sheet-corner">時間</div>{renderDates.map((d,i)=>{const originalIndex=windowStart+i;return <div className={`sheet-date ${originalIndex===dayIndex?"mobile-active":""}`} key={d}>{dayLabel(d)}</div>})}
    {hours.map(time=><div className="sheet-row" key={time}>
     <div className={`sheet-time ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""}`}>{time}</div>
     {renderDates.map((date,i)=>{const originalIndex=windowStart+i,items=byCell.get(`${date}|${time}`)??[],flightSegments=time==="全天"||time==="住宿"?[]:(flightSegmentsByCell.get(`${date}|${time}`)??[]),occupied=Boolean(items.length||flightSegments.length);return <div className={`sheet-cell ${originalIndex===dayIndex?"mobile-active":""} ${time==="全天"?"pinned-all-day":time==="住宿"?"pinned-stay":""} ${flightSegments.length?"has-flight-duration":""}`} key={`${date}-${time}`} onClick={()=>!occupied&&onAdd(date,time)}>
      {flightSegments.map((segment:any,index:number)=>{const item=segment.item as SheetAgenda,meta=flightMeta(item),laneOffset=Math.min(index,3)*5,oppositeOffset=Math.max(0,flightSegments.length-index-1)*5,top=segment.dayFirst?`${Math.max(0,segment.topPercent)}%`:"-1px",bottom=segment.dayLast?`${Math.max(0,segment.bottomPercent)}%`:"-1px",sameCell=segment.first&&segment.last;return <article className={`flight-duration-segment ${segment.dayFirst?"segment-day-start":""} ${segment.dayLast?"segment-day-end":""} ${segment.first?"segment-flight-start":""} ${segment.last?"segment-flight-end":""}`} key={`${item.id}-${date}-${time}`} style={{top,bottom,left:`${4+laneOffset}px`,right:`${4+oppositeOffset}px`}} title={`${item.startsAt.replace("T"," ")} ${item.departureTimezone||""} → ${(item.endsAt??"").replace("T"," ")} ${item.arrivalTimezone||""} ${item.title}`} onClick={e=>e.stopPropagation()}>
       {segment.first?<><b>✈ {item.title}</b><span>{item.startsAt.slice(11,16)} 出發・{item.origin||item.place||"航班"}{meta?` (${formatUtcOffset(meta.departureOffset)})`:item.departureTimezone?` (${item.departureTimezone})`:""}</span>{meta&&<small className="flight-timezone-meta">實際飛行 {formatDurationMinutes(meta.durationMinutes)}・{formatTimezoneDifference(meta.difference)}</small>}</>:segment.dayFirst?<><b>↳ {item.title}</b><span>跨日續飛</span></>:null}
       {segment.last&&<span className="flight-arrival">{sameCell?`${item.startsAt.slice(11,16)} 出發 → `:""}{item.endsAt?.slice(11,16)} 抵達・{item.destination||"目的地"}{meta?` (${formatUtcOffset(meta.arrivalOffset)})`:item.arrivalTimezone?` (${item.arrivalTimezone})`:""}</span>}
       {segment.first&&<button aria-label="永久刪除整張訂單" title="永久刪除整張訂單" onClick={e=>{e.stopPropagation();onDelete(item)}}>×</button>}
      </article>})}
      {items.length?items.map(item=>{const synced=isSyncedTravel(item);return <article className={`sheet-event type-${item.type.replaceAll("/","-")} ${synced?"synced-travel":""}`} key={item.id} onClick={e=>{e.stopPropagation();if(!synced)onEdit(item)}}><b>{item.type==="全天"||item.type==="住宿"?item.title:`${item.startsAt.slice(11,16)} ${item.title}`}</b><span>{synced?`${item.place||item.address||item.type}・訂單同步`:item.place||item.address||item.type}</span><button aria-label={synced?"永久刪除整張訂單":"刪除"} title={synced?"永久刪除整張訂單":"刪除"} onClick={e=>{e.stopPropagation();onDelete(item)}}>×</button></article>}):!flightSegments.length?<button className="sheet-add" aria-label={`${date} ${time} 新增`}>＋</button>:null}</div>})}
    </div>)}
   </div>
  </div>
  </div>
  <p className="agenda-sheet-tip"><span className="desktop-agenda-title">Calendar 固定 24 小時；桌機一次只掛載最多 7 天，長行程用前／後 7 天切換。</span><span className="mobile-agenda-title">左右切換所有日期；全天與住宿固定顯示在最上方。</span> 航班依兩端當地時間定位；UTC 只用來計算真實飛行時間與時差，因此 travel band 高度不等於實際飛行時數。</p>
 </section>;
}

export const blankForCell=(date:string,time:string):SheetAgenda=>({id:`new-${Date.now()}`,type:typeFor(time),title:"",startsAt:`${date}T${time==="全天"||time==="住宿"?"09:00":time}`,timezone:"",place:"",version:0});