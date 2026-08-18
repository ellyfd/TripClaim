"use client";
import {useEffect,useState} from "react";
export type Requirement={id:string;label:string;detail:string;status:"complete"|"missing"|"review"};
const actionLabel=(item:Requirement)=>item.id.startsWith("slip-")?"補刷卡單":item.id.startsWith("statement-")?"補信用卡帳單":item.id.startsWith("review-")?"去確認":null;
export default function MissingRequirements({tripId,refreshKey=0,onFix}:{tripId?:string;refreshKey?:number;onFix?:(item:Requirement)=>void}){
 const [items,setItems]=useState<Requirement[]>([]);const [loading,setLoading]=useState(true);
 useEffect(()=>{setLoading(true);setItems([]);fetch(`/api/missing-requirements${tripId?`?tripId=${encodeURIComponent(tripId)}`:""}`).then(r=>r.ok?r.json():null).then(x=>{setItems(x?.requirements??[]);setLoading(false)}).catch(()=>setLoading(false))},[tripId,refreshKey]);
 const missing=items.filter(x=>x.status==="missing").length,review=items.filter(x=>x.status==="review").length;
 return <section className="missing-live panel"><div className="missing-live-head"><div><span>即時完整度</span><h2>{loading?"正在檢查…":missing||review?`還有 ${missing+review} 項要處理`:"目前沒有缺件"}</h2><p>文件、個人卡附件與公司固定主檔會一起檢查。</p></div><b>{items.length?Math.round(items.filter(x=>x.status==="complete").length/items.length*100):100}%</b></div>{!loading&&!items.length?<div className="missing-empty">確認文件後，系統會自動列出刷卡單、個人帳單與無法對應主檔的舊資料。</div>:<div className="missing-list">{items.map(x=>{const action=actionLabel(x);return <article key={x.id} className={x.status}><i>{x.status==="complete"?"✓":x.status==="missing"?"!":"?"}</i><div><b>{x.label}</b><span>{x.detail}</span></div><em>{x.status==="complete"?"已齊全":x.status==="missing"?"缺件":"待確認"}</em>{action&&onFix&&<button type="button" onClick={()=>onFix(x)}>{action}</button>}</article>})}</div>}</section>
}
