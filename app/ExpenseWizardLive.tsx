"use client";
import {useEffect,useRef,useState} from "react";
import DocumentInbox from "./DocumentInbox";
import CardCenter from "./CardCenter";
import MissingRequirements from "./MissingRequirements";
import ExpenseSummary from "./ExpenseSummary";
import MobileExpenseOverview from "./MobileExpenseOverview";
import {prepareImageForUpload,recognizeDocumentText} from "./client-document-processing";
type Result={name:string;state:"uploading"|"scanning"|"review"|"done"|"duplicate"|"failed";confidence?:number;warnings?:string[]};

export default function ExpenseWizardLive({tripId}:{tripId:string}){
 const [results,setResults]=useState<Result[]>([]),[busy,setBusy]=useState(false),[uploadType,setUploadType]=useState("自動辨識"),[showCards,setShowCards]=useState(false),[showDesktopTools,setShowDesktopTools]=useState(false),[refreshKey,setRefreshKey]=useState(0);const ref=useRef<HTMLInputElement>(null);
 const choose=(type:string)=>{setUploadType(type);ref.current?.click()};
 useEffect(()=>{const openUpload=()=>{setUploadType("自動辨識");ref.current?.click()};window.addEventListener("tripclaim:upload",openUpload);return()=>window.removeEventListener("tripclaim:upload",openUpload)},[]);
 const upload=async()=>{const files=Array.from(ref.current?.files??[]);if(!files.length)return;setBusy(true);setResults(files.map(f=>({name:f.name,state:"uploading"})));for(const original of files){setResults(v=>v.map(x=>x.name===original.name?{...x,state:"scanning"}:x));let file=original,localWarnings:string[]=[];try{const prepared=await prepareImageForUpload(original);file=prepared.file;localWarnings=prepared.warnings}catch{/* Preserve the original when browser image processing is unavailable. */}const body=new FormData();body.append("file",file,original.name);body.append("documentType",uploadType);if(tripId)body.append("tripId",tripId);try{const text=await recognizeDocumentText(file);if(text)body.append("ocrText",text)}catch{/* Keep the original file and let the user confirm missing fields. */}let result:Result={name:original.name,state:"failed"};for(let attempt=0;attempt<2&&result.state==="failed";attempt++){const r=await fetch("/api/documents",{method:"POST",body}).catch(()=>null);if(r?.ok){const data=await r.json();result={name:original.name,state:data.status==="ready"?"done":"review",confidence:data.confidence,warnings:[...localWarnings,...(data.warnings??[])]}}else if(r?.status===409)result={name:original.name,state:"duplicate"}}setResults(v=>v.map(x=>x.name===original.name?result:x))}setBusy(false);setRefreshKey(v=>v+1);if(ref.current)ref.current.value=""};
 const exportClick=(index:number)=>document.querySelector<HTMLButtonElement>(`.expense-export-actions button:nth-child(${index})`)?.click();
 return <main className="expense-workbench-page" id="my-expense">
  <header className="expense-workbench-head"><div><span>步驟 3・只顯示本人資料</span><h1>我的報帳</h1><p>中間整理費用流水帳；右側集中上傳、文件、缺件與匯出。</p></div><button className="expense-drawer-trigger" onClick={()=>setShowDesktopTools(true)}>工具與文件</button></header>
  <>
  <MobileExpenseOverview tripId={tripId} refreshKey={refreshKey}/>
  <div className="expense-workbench-grid"><section className="expense-workbench-main" id="expense-records"><ExpenseSummary tripId={tripId} refreshKey={refreshKey}/></section>
   <aside className={`expense-tools ${showDesktopTools?"drawer-open":""}`}>
    <div className="expense-drawer-head"><b>報帳工具</b><button onClick={()=>setShowDesktopTools(false)} aria-label="關閉工具">×</button></div>
    <section className="panel expense-upload-tools" id="expense-upload"><span>快速收件</span><h2>拍照或上傳</h2><button className="expense-upload-main" disabled={busy} onClick={()=>choose("自動辨識")}>{busy?"辨識中…":"＋ 上傳文件"}</button><small className="expense-upload-hint">收據、刷卡單、帳單、機票與住宿都能自動判斷。</small><div className="expense-type-buttons">{["收據／發票","刷卡單","信用卡帳單","機票","住宿","交通票券"].map(type=><button key={type} disabled={busy} onClick={()=>choose(type)}>{type}</button>)}</div><input ref={ref} type="file" multiple accept="image/*,.heic,.heif,.pdf" hidden onChange={upload}/>{results.length>0&&<div className="expense-side-results">{results.slice(-3).map((x,i)=><p className={x.state} key={`${x.name}-${i}`}><b>{x.state==="done"?"✓":x.state==="review"?"?":x.state==="duplicate"?"↺":x.state==="failed"?"!":"…"}</b><span>{x.name}<small>{x.state==="uploading"?"正在安全上傳":x.state==="scanning"?"正在讀取文字與金額":x.state==="review"?`已讀取・待你確認${typeof x.confidence==="number"?`・${x.confidence}%`:""}`:x.state==="done"?"已確認":x.state==="duplicate"?"曾經上傳過":"上傳失敗，請重試"}</small>{x.warnings?.length?<em>{x.warnings.slice(0,2).join("、")}</em>:null}</span></p>)}</div>}</section>
    <div className="expense-side-documents"><DocumentInbox tripId={tripId} refreshKey={refreshKey}/></div>
    <MissingRequirements tripId={tripId} refreshKey={refreshKey}/>
    <section className="panel expense-side-actions"><span>個人卡與輸出</span><button onClick={()=>setShowCards(true)}>管理我的信用卡／帳單</button><button onClick={()=>exportClick(1)}>下載 CSV</button><button onClick={()=>exportClick(2)}>下載 Excel</button><button onClick={()=>exportClick(3)}>列印／PDF</button></section>
    <details className="panel mobile-expense-more"><summary>信用卡附件</summary><button onClick={()=>setShowCards(true)}>上傳帳單／登記卡片</button><small>批次核對與 CSV、Excel、PDF、ZIP 請回電腦版處理。</small></details>
   </aside>
  </div>
  {showDesktopTools&&<button className="expense-drawer-backdrop" aria-label="關閉工具" onClick={()=>setShowDesktopTools(false)}/>}
  {showCards&&<div className="expense-tools-overlay" onClick={()=>setShowCards(false)}><div onClick={e=>e.stopPropagation()}><button className="expense-tools-close" onClick={()=>setShowCards(false)}>×</button><CardCenter tripId={tripId}/></div></div>}
  </>
 </main>;
}
