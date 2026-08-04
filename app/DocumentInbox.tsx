"use client";

import { useEffect, useState } from "react";
import { zipSync } from "fflate";

type Doc={id:string;originalName:string;mimeType:string;sizeBytes:number;documentType:string;claimType:string|null;expenseDate:string|null;merchant:string|null;currency:string|null;amountMinor:number|null;paymentMethod:string|null;cardLast4:string|null;suggestedName:string|null;status:string;extractionConfidence:number|null;extractionWarnings:string|null;sourceExcerpt:string|null;createdAt:string};
const claimTypes=["機票(自行刷卡)","住宿","車資","餐飲","電信網路費","預支歸還"];
const ext=(name:string)=>name.includes(".")?name.slice(name.lastIndexOf(".")):"";
const safe=(value:string)=>value.trim().replace(/[^\p{L}\p{N}._-]+/gu,"-");
const warnings=(value:string|null)=>{try{return value?JSON.parse(value) as string[]:[]}catch{return[]}};

export default function DocumentInbox({tripId,refreshKey=0}:{tripId?:string;refreshKey?:number}){
 const [docs,setDocs]=useState<Doc[]>([]); const [open,setOpen]=useState<string|null>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");const [query,setQuery]=useState("");const [bundling,setBundling]=useState(false);
 const load=()=>fetch(`/api/documents${tripId?`?tripId=${encodeURIComponent(tripId)}`:""}`).then(x=>x.ok?x.json():null).then(x=>{if(x)setDocs(x.documents??[]);setLoading(false)}).catch(()=>setLoading(false)); useEffect(load,[tripId,refreshKey]);useEffect(()=>{const reload=()=>load();window.addEventListener("tripclaim:data-changed",reload);return()=>window.removeEventListener("tripclaim:data-changed",reload)},[tripId]);
 const save=async(d:Doc,form:HTMLFormElement)=>{const fd=new FormData(form);const date=String(fd.get("date")||"");const merchant=String(fd.get("merchant")||"");const claimType=String(fd.get("claimType")||"餐飲");const currency=String(fd.get("currency")||"").toUpperCase();const amount=Number(fd.get("amount")||0);const city=String(fd.get("city")||"未分類");const paymentMethod=String(fd.get("paymentMethod")||"cash");const cardLast4=String(fd.get("cardLast4")||"");const suggested=`EXP-${date.replaceAll("-","")||"待確認"}_${safe(city)}_${safe(claimType)}_${safe(merchant||"待確認")}_${currency||"幣別"}${amount||0}_${safe(d.documentType)}${ext(d.originalName)}`;const response=await fetch(`/api/documents/${d.id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({claimType,expenseDate:date,merchant,currency,amountMinor:Math.round(amount*100),paymentMethod,cardLast4,suggestedName:suggested,status:"ready"})});if(response.ok){setMessage("已按旅費報支項目確認、重新命名並加入我的報支");setOpen(null);load();setTimeout(()=>setMessage(""),2000)}};
 const remove=async(d:Doc)=>{if(!window.confirm(`確定刪除「${d.suggestedName||d.originalName}」？原始檔、連結費用及相關機票／住宿行程會一起刪除，無法復原。`))return;const response=await fetch(`/api/documents/${d.id}`,{method:"DELETE"});if(response.ok){setMessage("文件、費用與相關行程已同步刪除");setOpen(null);load();window.dispatchEvent(new Event("tripclaim:data-changed"));setTimeout(()=>setMessage(""),2200)}else{setMessage("刪除失敗，請重新整理後再試");setTimeout(()=>setMessage(""),2200)}};
 const downloadAll=async()=>{if(!docs.length)return;setBundling(true);setMessage("正在打包全部標準檔名附件…");try{const files:Record<string,Uint8Array>={};for(let i=0;i<docs.length;i++){const d=docs[i],r=await fetch(`/api/documents/${d.id}?download=1`);if(!r.ok)throw new Error(d.originalName);const base=d.suggestedName||d.originalName,name=files[base]?`${String(i+1).padStart(3,"0")}_${base}`:base;files[name]=new Uint8Array(await r.arrayBuffer())}const zipped=zipSync(files,{level:6}),buffer=zipped.buffer.slice(zipped.byteOffset,zipped.byteOffset+zipped.byteLength) as ArrayBuffer,url=URL.createObjectURL(new Blob([buffer],{type:"application/zip"})),a=document.createElement("a");a.href=url;a.download=`我的出差附件_${new Date().toISOString().slice(0,10)}.zip`;a.click();URL.revokeObjectURL(url);setMessage(`已打包 ${docs.length} 份本人附件`)}catch{setMessage("附件打包失敗，請重試或個別下載")}finally{setBundling(false);setTimeout(()=>setMessage(""),2600)}};
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
<label>日期<input name="date" type="date" defaultValue={d.expenseDate??""}/>
</label>
<label>國家／城市<input name="city" placeholder="例如 FR-Paris"/>
</label>
<label>請款類型<select name="claimType" defaultValue={d.claimType??(d.documentType.includes("住宿")?"住宿":d.documentType.includes("機票")?"機票(自行刷卡)":d.documentType.includes("交通")?"車資":"餐飲")}>{claimTypes.map(x=>
<option key={x}>{x}</option>)}</select>
</label>
<label>店家<input name="merchant" defaultValue={d.merchant??""} placeholder="例如 Starbucks"/>
</label>
<label>幣別<input name="currency" defaultValue={d.currency??""} placeholder="例如 EUR"/>
</label>
<label>金額<input name="amount" type="number" step="0.01" defaultValue={d.amountMinor?d.amountMinor/100:""}/>
</label>
<label>付款方式<select name="paymentMethod" defaultValue={d.paymentMethod??"cash"}><option value="cash">現金</option><option value="credit_card">個人信用卡</option><option value="other">其他</option></select>
</label>
<label>卡號末四碼<input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={d.cardLast4??""} placeholder="信用卡付款時填寫"/>
</label>
<button type="submit">確認並重新命名</button>
</form>}</article>)}</div>}{message&&<div className="document-message">✓ {message}</div>}</section>
}
