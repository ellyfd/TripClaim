"use client";

import { useEffect, useState } from "react";
import {DEFAULT_CLAIM_TYPES,DEFAULT_CURRENCIES,DEFAULT_DESTINATIONS,normalizeCurrency} from "./managed-config";

type Doc={id:string;originalName:string;mimeType:string;sizeBytes:number;documentType:string;claimType:string|null;expenseDate:string|null;merchant:string|null;currency:string|null;amountMinor:number|null;detectedCurrency:string|null;detectedAmountMinor:number|null;paymentMethod:string|null;cardLast4:string|null;suggestedName:string|null;status:string;extractionConfidence:number|null;extractionWarnings:string|null;sourceExcerpt:string|null;createdAt:string};
const managedCities=Object.entries(DEFAULT_DESTINATIONS).flatMap(([country,cities])=>cities.map(city=>`${country}｜${city}`));
const ext=(name:string)=>name.includes(".")?name.slice(name.lastIndexOf(".")):"";
const safe=(value:string)=>value.trim().replace(/[^\p{L}\p{N}._-]+/gu,"-");
const warnings=(value:string|null)=>{try{return value?JSON.parse(value) as string[]:[]}catch{return[]}};

export default function DocumentInbox({tripId,refreshKey=0}:{tripId?:string;refreshKey?:number}){
 const [docs,setDocs]=useState<Doc[]>([]); const [open,setOpen]=useState<string|null>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");const [query,setQuery]=useState("");const [bundling,setBundling]=useState(false);
 const load=()=>fetch(`/api/documents${tripId?`?tripId=${encodeURIComponent(tripId)}`:""}`).then(x=>x.ok?x.json():null).then(x=>{if(x)setDocs(x.documents??[]);setLoading(false)}).catch(()=>setLoading(false)); useEffect(load,[tripId,refreshKey]);useEffect(()=>{const reload=()=>load();window.addEventListener("tripclaim:data-changed",reload);return()=>window.removeEventListener("tripclaim:data-changed",reload)},[tripId]);
 const save=async(d:Doc,form:HTMLFormElement)=>{const fd=new FormData(form);const date=String(fd.get("date")||"");const merchant=String(fd.get("merchant")||"");const cardEvidence=d.documentType.includes("信用卡帳單")||d.documentType.includes("刷卡單");const claimType=cardEvidence?undefined:String(fd.get("claimType")||"餐飲");const originalCurrency=String(d.detectedCurrency??d.currency??"TWD").toUpperCase();const originalAmount=Number(d.detectedAmountMinor??d.amountMinor??0)/100;const reportingCurrency=normalizeCurrency(String(fd.get("reportingCurrency")||"TWD"));const reportingAmount=Number(fd.get("reportingAmount")||0);const city=String(fd.get("city")||"未分類");const paymentMethod=String(fd.get("paymentMethod")||"cash");const cardLast4=String(fd.get("cardLast4")||"");const suggested=cardEvidence?`EVIDENCE-${date.replaceAll("-","")||"待確認"}_${safe(d.documentType)}_${safe(merchant||"信用卡")}${ext(d.originalName)}`:`EXP-${date.replaceAll("-","")||"待確認"}_${safe(city)}_${safe(claimType||"待確認")}_${safe(merchant||"待確認")}_${reportingCurrency}${reportingAmount||0}_${safe(d.documentType)}${ext(d.originalName)}`;const response=await fetch(`/api/documents/${d.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({claimType,expenseDate:date,merchant,originalCurrency,originalAmountMinor:Math.round(originalAmount*100),reportingCurrency,reportingAmountMinor:Math.round(reportingAmount*100),paymentMethod,cardLast4,suggestedName:suggested,status:"ready"})});if(response.ok){setMessage(cardEvidence?"付款證明已保存，不會重複建立消費":"已保留原始金額，並按公司申報幣別加入我的報支");setOpen(null);load();setTimeout(()=>setMessage(""),2000)}else{const result=await response.json().catch(()=>null);setMessage(result?.message||"請確認申報幣別與金額")}};
 const remove=async(d:Doc)=>{if(!window.confirm(`確定刪除「${d.suggestedName||d.originalName}」？原始檔、連結費用及相關機票／住宿行程會一起刪除，無法復原。`))return;const response=await fetch(`/api/documents/${d.id}`,{method:"DELETE"});if(response.ok){setMessage("文件、費用與相關行程已同步刪除");setOpen(null);load();window.dispatchEvent(new Event("tripclaim:data-changed"));setTimeout(()=>setMessage(""),2200)}else{setMessage("刪除失敗，請重新整理後再試");setTimeout(()=>setMessage(""),2200)}};
 const downloadAll=async()=>{if(!tripId)return;setBundling(true);setMessage("正在依報支項目與申報幣別建立檔案包…");try{const response=await fetch(`/api/trips/${encodeURIComponent(tripId)}/export`);if(!response.ok)throw new Error("export_failed");const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");a.href=url;a.download=`TripClaim_${new Date().toISOString().slice(0,10)}.zip`;a.click();URL.revokeObjectURL(url);setMessage("已建立報支彙總、明細、附件索引與分組附件")}catch{setMessage("附件打包失敗，請重試")}finally{setBundling(false);setTimeout(()=>setMessage(""),3000)}};
 if(loading)return <section className="document-inbox panel">
<p>正在讀取我的文件…</p>
</section>;
 const visible=docs.filter(d=>!query||[d.originalName,d.suggestedName,d.merchant,d.documentType,d.claimType].some(x=>x?.toLowerCase().includes(query.toLowerCase()))),reviewCount=docs.filter(d=>d.status!=="ready").length;
 return <section className="document-inbox panel">
<div className="document-head">
<div>
<span>我的文件</span>
<h2>{docs.length} 份文件</h2>
<p>{reviewCount?`${reviewCount} 份待確認`:"已全部確認"}・僅本人與授權財務可查看</p>
</div>
<div className="document-head-actions"><button disabled={bundling||!docs.length} onClick={downloadAll}>{bundling?"打包中…":"↓ 全部 ZIP"}</button><button onClick={load}>重新整理</button></div>
</div>{docs.length>0&&<div className="document-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋日期、店家、請款類型或檔名"/><b>{visible.length} / {docs.length} 份</b></div>}{!docs.length?<div className="document-empty">
<b>還沒有文件</b>
<span>點底部「＋ 上傳」即可開始。</span>
</div>:!visible.length?<div className="document-empty"><b>找不到相符文件</b><span>請換一個店家、類型或檔名關鍵字。</span></div>:<div className="document-list">{visible.map(d=>
<article key={d.id} className="document-row">
<div className="file-kind">{d.mimeType.includes("pdf")?"PDF":"IMG"}</div>
<div className="file-copy">
<b>{d.suggestedName||d.originalName}</b>
<span>{(d.sizeBytes/1024).toFixed(0)} KB・文件：{d.documentType||"待分類"}・請款：{d.claimType||"待確認"}</span>
<div className={`document-state ${d.status}`}><strong>{d.status==="ready"?"已確認":d.status==="failed"?"辨識失敗":"待確認"}</strong>{typeof d.extractionConfidence==="number"&&<small>辨識 {d.extractionConfidence}%</small>}{warnings(d.extractionWarnings).length>0&&<em>{warnings(d.extractionWarnings).slice(0,2).join("、")}</em>}</div>
</div>
<a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">查看原檔</a>
<a className="document-download" href={`/api/documents/${d.id}?download=1`}>下載標準檔名</a>
<button onClick={()=>setOpen(open===d.id?null:d.id)}>{d.status==="ready"?"修改":"確認資料"}</button>
<button type="button" className="document-delete" onClick={()=>remove(d)}>刪除</button>{open===d.id&&<form className="document-editor" onSubmit={e=>{e.preventDefault();save(d,e.currentTarget)}}>
{(d.documentType.includes("信用卡帳單")||d.documentType.includes("刷卡單"))&&<p className="card-evidence-note">這是付款證明，不會另建一筆消費。國外交易手續費請另外建立為 TWD 費用。</p>}
<label>日期<input name="date" type="date" defaultValue={d.expenseDate??""}/>
</label>
<label>國家／城市<select name="city" defaultValue="" required><option value="" disabled>選擇公司主檔中的國家／城市</option>{managedCities.map(x=><option key={x}>{x}</option>)}</select>
</label>
<label>報支項目<select name="claimType" defaultValue={d.claimType??(d.documentType.includes("住宿")?"住宿":d.documentType.includes("機票")?"機票(自行刷卡)":d.documentType.includes("交通")?"車資":"餐飲")}>{DEFAULT_CLAIM_TYPES.map(x=>
<option key={x}>{x}</option>)}</select>
</label>
<label>店家<input name="merchant" defaultValue={d.merchant??""} placeholder="例如 Starbucks"/>
</label>
<div className="document-original-money"><b>原始單據金額</b><span>{d.detectedCurrency??d.currency??"待確認"} {((d.detectedAmountMinor??d.amountMinor??0)/100).toLocaleString()}</span><small>原始辨識資料會保留，不會被申報金額覆蓋。</small></div>
<label>申報幣別<select name="reportingCurrency" defaultValue={normalizeCurrency(d.detectedCurrency??d.currency??"TWD")}>{DEFAULT_CURRENCIES.map(([code,name])=><option key={code} value={code}>{code} {name}</option>)}</select>
</label>
{(d.detectedCurrency??d.currency)&&!DEFAULT_CURRENCIES.some(([code])=>code===(d.detectedCurrency??d.currency))&&<p className="currency-warning">原單據為 {d.detectedCurrency??d.currency}；公司系統僅能以 TWD 報支，請填入實際 TWD 請款金額。</p>}
<label>申報金額<input name="reportingAmount" type="number" min="0" step="0.01" required defaultValue={DEFAULT_CURRENCIES.some(([code])=>code===(d.detectedCurrency??d.currency))?(d.detectedAmountMinor??d.amountMinor??0)/100:""}/>
</label>
<label>付款方式<select name="paymentMethod" defaultValue={d.paymentMethod??"cash"}><option value="cash">現金</option><option value="credit_card">個人信用卡</option><option value="other">其他</option></select>
</label>
<label>卡號末四碼<input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={d.cardLast4??""} placeholder="信用卡付款時填寫"/>
</label>
<button type="submit">確認並重新命名</button>
</form>}</article>)}</div>}{message&&<div className="document-message">✓ {message}</div>}</section>
}
