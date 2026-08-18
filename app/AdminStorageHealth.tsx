"use client";
import {useCallback,useEffect,useState} from "react";

type HealthItem={id:string;ownerEmail:string;tripId:string;sourceType:string;sourceId:string|null;attempts:number;lastError:string|null;createdAt:string;updatedAt:string};
type HealthPayload={summary:{pending:number;oldestCreatedAt:string|null;maxAttempts:number};items:HealthItem[]};

const age=(value:string|null)=>{if(!value)return "—";const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));if(minutes<60)return `${minutes} 分鐘`;const hours=Math.floor(minutes/60);if(hours<48)return `${hours} 小時`;return `${Math.floor(hours/24)} 天`};

export default function AdminStorageHealth(){
 const [data,setData]=useState<HealthPayload|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const r=await fetch("/api/admin/health",{cache:"no-store"});if(r.ok)setData(await r.json());else setMessage(r.status===403?"只有管理者可以查看系統健康":"無法讀取系統健康狀態")},[]);
 useEffect(()=>{load().catch(()=>setMessage("無法讀取系統健康狀態"))},[load]);
 const retry=async()=>{setBusy(true);setMessage("正在重試待清理附件…");try{const r=await fetch("/api/admin/health",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"retry_pending_storage"})});if(!r.ok)throw new Error("retry_failed");const result=await r.json();setMessage(result.remaining?`已清理 ${result.deleted} 個，仍有 ${result.remaining} 個待清理`:`已清理 ${result.deleted} 個，目前沒有待清理附件`);await load()}catch{setMessage("重試失敗；待清理記錄仍保留，不會遺失")}finally{setBusy(false)}};
 const summary=data?.summary;
 return <div className="management-list admin-storage-health">
  <div className="management-note"><b>Storage cleanup health</b><p>正式 travel order 從資料庫移除後，若 R2 暫時刪除失敗，系統會保留 tombstone 並持續重試。此頁不顯示實際 object key。</p></div>
  <div className="health-summary">
   <article><span>待清理</span><b>{summary?.pending??"—"}</b></article>
   <article><span>最舊等待</span><b>{age(summary?.oldestCreatedAt??null)}</b></article>
   <article><span>最高嘗試</span><b>{summary?.maxAttempts??"—"}</b></article>
  </div>
  <div className="management-add"><button disabled={busy||!summary?.pending} onClick={retry}>{busy?"重試中…":"重試待清理附件"}</button><button disabled={busy} onClick={()=>load()}>重新整理</button></div>
  {message&&<strong>{message}</strong>}
  {!data?<p>正在讀取…</p>:!data.items.length?<div className="management-note"><b>✓ Storage cleanup 正常</b><p>目前沒有 pending object deletion。</p></div>:data.items.map(item=><article className="login-user-row health-row" key={item.id}><div><b>{item.sourceType}・{item.sourceId??"legacy"}</b><small>{item.ownerEmail}・Trip {item.tripId}</small><small>等待 {age(item.createdAt)}・已嘗試 {item.attempts} 次</small>{item.lastError&&<small>{item.lastError}</small>}</div><span>{new Date(item.updatedAt).toLocaleString()}</span></article>)}
 </div>;
}
