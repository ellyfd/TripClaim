"use client";
import {useEffect,useRef,useState} from "react";
import DocumentInbox from "./DocumentInbox";
import CardCenter from "./CardCenter";
import MissingRequirements from "./MissingRequirements";
import ExpenseSummary from "./ExpenseSummary";
type Result={name:string;state:"uploading"|"scanning"|"review"|"done"|"duplicate"|"failed";confidence?:number;warnings?:string[]};

export default function ExpenseWizardLive({onBack}:{onBack:()=>void}){
 const [tripId,setTripId]=useState(""),[results,setResults]=useState<Result[]>([]),[busy,setBusy]=useState(false),[uploadType,setUploadType]=useState("自動辨識"),[showCards,setShowCards]=useState(false),[pageState,setPageState]=useState<"loading"|"ready"|"unavailable">("loading"),[refreshKey,setRefreshKey]=useState(0);const ref=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  let cancelled=false;
  const start=async()=>{
   let saved="";
   try{saved=window.sessionStorage.getItem("activeTripId")||""}catch{/* Some privacy-restricted browsers block session storage. */}
   if(!saved){const response=await fetch("/api/trips");if(response.ok)saved=(await response.json())?.trips?.[0]?.id||""}
   if(cancelled)return;
   setTripId(saved);
   setPageState(saved?"ready":"unavailable");
  };
  start().catch(()=>{if(!cancelled)setPageState("unavailable")});
  return()=>{cancelled=true};
 },[]);
 const choose=(type:string)=>{setUploadType(type);ref.current?.click()};
 useEffect(()=>{const openUpload=()=>{setUploadType("自動辨識");ref.current?.click()};window.addEventListener("tripclaim:upload",openUpload);return()=>window.removeEventListener("tripclaim:upload",openUpload)},[]);
 const upload=async()=>{const files=Array.from(ref.current?.files??[]);if(!files.length)return;setBusy(true);setResults(files.map(f=>({name:f.name,state:"uploading"})));for(const file of files){setResults(v=>v.map(x=>x.name===file.name?{...x,state:"scanning"}:x));const body=new FormData();body.append("file",file);body.append("documentType",uploadType);if(tripId)body.append("tripId",tripId);try{if(file.type.startsWith("image/")&&!["image/heic","image/heif"].includes(file.type)){const {createWorker}=await import("tesseract.js");const recognize=(async()=>{const worker=await createWorker("eng",1,{errorHandler:()=>{},workerPath:"/ocr/worker.min.js",corePath:"/ocr"});try{return (await worker.recognize(file)).data.text}finally{worker.terminate().catch(()=>{})}})();const text=await Promise.race([recognize,new Promise<string>(resolve=>setTimeout(()=>resolve(""),12000))]);if(text)body.append("ocrText",text)}}catch{/* OCR is best-effort; keep the original file and let the user confirm fields. */}let result:Result={name:file.name,state:"failed"};for(let attempt=0;attempt<2&&result.state==="failed";attempt++){const r=await fetch("/api/documents",{method:"POST",body}).catch(()=>null);if(r?.ok){const data=await r.json();result={name:file.name,state:data.status==="ready"?"done":"review",confidence:data.confidence,warnings:data.warnings??[]}}else if(r?.status===409)result={name:file.name,state:"duplicate"}}setResults(v=>v.map(x=>x.name===file.name?result:x))}setBusy(false);setRefreshKey(v=>v+1);if(ref.current)ref.current.value=""};
 const exportClick=(index:number)=>document.querySelector<HTMLButtonElement>(`.expense-export-actions button:nth-child(${index})`)?.click();
 return <main className="expense-workbench-page" id="my-expense">
  <header className="expense-workbench-head"><div><span>步驟 3・只顯示本人資料</span><h1>我的報帳</h1><p>拍到就上傳，AI 自動整理；缺件會主動提醒。</p></div></header>
  {pageState==="loading"&&<section className="expense-page-notice panel"><b>正在開啟我的報帳…</b><span>正在讀取目前出差與本人資料。</span></section>}
  {pageState==="unavailable"&&<section className="expense-page-notice panel"><b>尚未選擇出差</b><span>請先回到「我的出差」選擇一趟，再進入個人報帳。</span><button onClick={onBack}>返回共同行程</button></section>}
  {pageState==="ready"&&<>
  <div className="expense-workbench-grid"><section className="expense-workbench-main" id="expense-records"><ExpenseSummary tripId={tripId} refreshKey={refreshKey}/></section>
   <aside className="expense-tools">
    <section className="panel expense-upload-tools" id="expense-upload"><span>快速收件</span><h2>拍照或上傳</h2><button className="expense-upload-main" disabled={busy} onClick={()=>choose("自動辨識")}>{busy?"辨識中…":<><span className="upload-label-desktop">＋ 上傳文件</span><span className="upload-label-mobile">＋ 拍照／上傳單據</span></>}</button><small className="expense-upload-hint">收據、刷卡單、帳單、機票與住宿都能自動判斷。</small><div className="expense-type-buttons">{["收據／發票","刷卡單","信用卡帳單","機票","住宿","交通票券"].map(type=><button key={type} disabled={busy} onClick={()=>choose(type)}>{type}</button>)}</div><input ref={ref} type="file" multiple accept="image/*,.heic,.heif,.pdf" hidden onChange={upload}/>{results.length>0&&<div className="expense-side-results">{results.slice(-3).map((x,i)=><p className={x.state} key={`${x.name}-${i}`}><b>{x.state==="done"?"✓":x.state==="review"?"?":x.state==="duplicate"?"↺":x.state==="failed"?"!":"…"}</b><span>{x.name}<small>{x.state==="uploading"?"正在安全上傳":x.state==="scanning"?"正在讀取文字與金額":x.state==="review"?`已讀取・待你確認${typeof x.confidence==="number"?`・${x.confidence}%`:""}`:x.state==="done"?"已確認":x.state==="duplicate"?"曾經上傳過":"上傳失敗，請重試"}</small>{x.warnings?.length?<em>{x.warnings.slice(0,2).join("、")}</em>:null}</span></p>)}</div>}</section>
    <div className="expense-side-documents"><DocumentInbox tripId={tripId} refreshKey={refreshKey}/></div>
    <MissingRequirements tripId={tripId} refreshKey={refreshKey}/>
    <section className="panel expense-side-actions"><span>個人卡與輸出</span><button onClick={()=>setShowCards(true)}>管理我的信用卡／帳單</button><button onClick={()=>exportClick(1)}>下載 CSV</button><button onClick={()=>exportClick(2)}>下載 Excel</button><button onClick={()=>exportClick(3)}>列印／PDF</button></section>
    <details className="panel mobile-expense-more"><summary>更多：卡片管理與匯出</summary><small className="mobile-more-hint">ZIP、CSV 與列印屬於整理階段，建議回到電腦操作。</small><button onClick={()=>setShowCards(true)}>管理信用卡／帳單</button><button onClick={()=>exportClick(1)}>下載 CSV</button><button onClick={()=>exportClick(2)}>下載 Excel</button><button onClick={()=>exportClick(3)}>列印／PDF</button></details>
   </aside>
  </div>
  {showCards&&<div className="expense-tools-overlay" onClick={()=>setShowCards(false)}><div onClick={e=>e.stopPropagation()}><button className="expense-tools-close" onClick={()=>setShowCards(false)}>×</button><CardCenter tripId={tripId}/></div></div>}
  </>}
 </main>;
}
