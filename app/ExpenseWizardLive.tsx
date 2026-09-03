"use client";
import {XIcon,PlusIcon,CheckIcon,QuestionIcon} from "./icons";
import {useEffect,useRef,useState} from "react";
import DocumentInbox from "./DocumentInbox";
import CardCenter from "./CardCenter";
import MissingRequirements,{type Requirement} from "./MissingRequirements";
import ExpenseSummary from "./ExpenseSummary";
import MobileExpenseOverview from "./MobileExpenseOverview";
import {prepareImageForUpload,recognizeDocumentText} from "./client-document-processing";
type Result={name:string;state:"uploading"|"scanning"|"queued"|"review"|"done"|"duplicate"|"travel"|"failed";confidence?:number;warnings?:string[];queueId?:string};
const isTravelDocument=(value?:string)=>Boolean(value&&["機票","住宿","flight","stay"].some(term=>value.toLowerCase().includes(term.toLowerCase())));
const travelIntakeMessage="機票／住宿請從「行程 → 我的行程資料」上傳，確認後會直接同步到行事曆與報支。";
const expenseUploadTypes=["自動辨識","收據／發票","刷卡單","信用卡帳單","交通票券"];

export default function ExpenseWizardLive({tripId}:{tripId:string}){
 const [results,setResults]=useState<Result[]>([]),[busy,setBusy]=useState(false),[uploadType,setUploadType]=useState("自動辨識"),[showCards,setShowCards]=useState(false),[showDesktopTools,setShowDesktopTools]=useState(false),[refreshKey,setRefreshKey]=useState(0);const ref=useRef<HTMLInputElement>(null);
 const choose=(type:string)=>{setUploadType(type);ref.current?.click()};
 useEffect(()=>{const openUpload=()=>{setUploadType("自動辨識");ref.current?.click()};window.addEventListener("tripclaim:upload",openUpload);return()=>window.removeEventListener("tripclaim:upload",openUpload)},[]);
 useEffect(()=>{
  const synced=(event:Event)=>{const detail=(event as CustomEvent).detail;if(!detail?.id)return;setResults(v=>v.map(x=>x.queueId===detail.id?{...x,state:"review",warnings:[...(x.warnings??[]),"已恢復連線並完成上傳，請到我的文件確認資料"]}:x));setRefreshKey(v=>v+1)};
  const rejected=(event:Event)=>{const detail=(event as CustomEvent).detail;if(!detail?.id)return;setResults(v=>v.map(x=>x.queueId===detail.id?{...x,state:detail.reason==="travel_intake_required"?"travel":"failed",warnings:[detail.message??"離線文件未能完成同步"]}:x));setRefreshKey(v=>v+1)};
  window.addEventListener("tripclaim:upload-synced",synced);window.addEventListener("tripclaim:upload-rejected",rejected);
  return()=>{window.removeEventListener("tripclaim:upload-synced",synced);window.removeEventListener("tripclaim:upload-rejected",rejected)};
 },[]);
 const upload=async()=>{const files=Array.from(ref.current?.files??[]);if(!files.length)return;setBusy(true);setResults(files.map(f=>({name:f.name,state:"uploading"})));for(const original of files){setResults(v=>v.map(x=>x.name===original.name?{...x,state:"scanning"}:x));let file=original,localWarnings:string[]=[];try{const prepared=await prepareImageForUpload(original);file=prepared.file;localWarnings=prepared.warnings}catch{/* Preserve the original when browser image processing is unavailable. */}const body=new FormData();body.append("file",file,original.name);body.append("documentType",uploadType);body.append("uploadContext","expense");if(tripId)body.append("tripId",tripId);try{const text=await recognizeDocumentText(file);if(text)body.append("ocrText",text)}catch{/* Keep the original file and let the user confirm missing fields. */}let result:Result={name:original.name,state:"failed"};for(let attempt=0;attempt<2&&result.state==="failed";attempt++){const r=await fetch("/api/documents",{method:"POST",body}).catch(()=>null);if(r?.ok){const data=await r.json();if(data.queued){result={name:original.name,state:"queued",queueId:data.queueId,confidence:data.confidence,warnings:[...localWarnings,...(data.warnings??[])]}}else if(isTravelDocument(data.documentType)){let discarded=false;if(data.id){const cleanup=await fetch(`/api/documents/${data.id}?discard=1`,{method:"DELETE"}).catch(()=>null);discarded=Boolean(cleanup?.ok||cleanup?.status===404)}result={name:original.name,state:"travel",warnings:[...localWarnings,discarded?travelIntakeMessage:"這份文件被辨識為機票／住宿，但未能自動清除；請先在「我的文件」刪除後，再從行程上方的「我的行程資料」上傳。"]}}else result={name:original.name,state:data.status==="ready"?"done":"review",confidence:data.confidence,warnings:[...localWarnings,...(data.warnings??[])]}}else if(r?.status===409)result={name:original.name,state:"duplicate"}}setResults(v=>v.map(x=>x.name===original.name?result:x))}setBusy(false);setRefreshKey(v=>v+1);if(ref.current)ref.current.value=""};
 const exportClick=(index:number)=>document.querySelector<HTMLButtonElement>(`.expense-export-actions button:nth-child(${index})`)?.click();
 const fixRequirement=(item:Requirement)=>{if(item.id.startsWith("slip-")){choose("刷卡單");return}if(item.id.startsWith("statement-")){choose("信用卡帳單");return}setShowDesktopTools(true);window.setTimeout(()=>document.querySelector(".expense-side-documents")?.scrollIntoView({behavior:"smooth",block:"start"}),80)};
 return <main className="expense-workbench-page" id="my-expense">
  <header className="expense-workbench-head"><div><span>只顯示本人資料</span><h1>我的報支</h1><p>費用、文件、缺件與匯出都集中在這裡；機票與住宿則直接從行程上方同步進來。</p></div><button className="expense-drawer-trigger" onClick={()=>setShowDesktopTools(true)}>工具與文件</button></header>
  <>
  <MobileExpenseOverview tripId={tripId} refreshKey={refreshKey}/>
  <div className="expense-workbench-grid"><section className="expense-workbench-main" id="expense-records"><ExpenseSummary tripId={tripId} refreshKey={refreshKey}/></section>
   <aside className={`expense-tools ${showDesktopTools?"drawer-open":""}`}>
    <div className="expense-drawer-head"><b>報支工具</b><button onClick={()=>setShowDesktopTools(false)} aria-label="關閉工具"><XIcon/></button></div>
    <section className="panel expense-upload-tools" id="expense-upload"><span>快速收件</span><h2>拍照或上傳</h2><label className="expense-upload-type">文件類型<select value={uploadType} disabled={busy} onChange={e=>setUploadType(e.target.value)}>{expenseUploadTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label><button className="expense-upload-main" disabled={busy} onClick={()=>ref.current?.click()}>{busy?"辨識中…":<><PlusIcon/> 上傳文件</>}</button><small className="expense-upload-hint">收據、刷卡單、帳單與交通票券共用這一個上傳入口；需要時先選文件類型。機票／住宿請到「行程 → 我的行程資料」上傳，確認後會直接同步行事曆與報支。</small><input ref={ref} type="file" multiple accept="image/*,.heic,.heif,.pdf" hidden onChange={upload}/>{results.length>0&&<div className="expense-side-results">{results.slice(-3).map((x,i)=><p className={x.state} key={`${x.name}-${i}`}><b>{x.state==="done"?<CheckIcon/>:x.state==="review"?<QuestionIcon/>:x.state==="queued"?"↻":x.state==="travel"?"↗":x.state==="duplicate"?"↺":x.state==="failed"?"!":"…"}</b><span>{x.name}<small>{x.state==="uploading"?"正在安全上傳":x.state==="scanning"?"正在讀取文字與金額":x.state==="queued"?"已保存在手機，恢復連線後自動同步":x.state==="travel"?"請到行程上方的我的行程資料上傳":x.state==="review"?`已讀取・待你確認${typeof x.confidence==="number"?`・${x.confidence}%`:""}`:x.state==="done"?"已確認":x.state==="duplicate"?"曾經上傳過":"上傳失敗，請重試"}</small>{x.warnings?.length?<em>{x.warnings.slice(0,2).join("、")}</em>:null}</span></p>)}</div>}</section>
    <div className="expense-side-documents"><DocumentInbox tripId={tripId} refreshKey={refreshKey}/></div>
    <MissingRequirements tripId={tripId} refreshKey={refreshKey} onFix={fixRequirement}/>
    <section className="panel expense-side-actions"><span>個人卡與輸出</span><button onClick={()=>setShowCards(true)}>管理我的信用卡／帳單</button><button onClick={()=>exportClick(1)}>下載 CSV</button><button onClick={()=>exportClick(2)}>下載 Excel</button><button onClick={()=>exportClick(3)}>列印／PDF</button></section>
    <details className="panel mobile-expense-more"><summary>信用卡附件</summary><button onClick={()=>setShowCards(true)}>上傳帳單／登記卡片</button><small>批次核對與 CSV、Excel、PDF、ZIP 請回電腦版處理。</small></details>
   </aside>
  </div>
  {showDesktopTools&&<button className="expense-drawer-backdrop" aria-label="關閉工具" onClick={()=>setShowDesktopTools(false)}/>} 
  {showCards&&<div className="expense-tools-overlay" onClick={()=>setShowCards(false)}><div onClick={e=>e.stopPropagation()}><button className="expense-tools-close" onClick={()=>setShowCards(false)}><XIcon/></button><CardCenter tripId={tripId}/></div></div>}
  </>
 </main>;
}
