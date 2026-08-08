"use client";
import {useEffect,useState} from "react";

type Expense={id:string;expenseDate:string;merchant:string;status:string;reportingCurrency:string|null;reportingAmountMinor:number|null;currency:string;amountMinor:number};

export default function MobileExpenseOverview({tripId,refreshKey}:{tripId:string;refreshKey:number}){
 const [items,setItems]=useState<Expense[]>([]);
 useEffect(()=>{let active=true;fetch(`/api/expenses?tripId=${encodeURIComponent(tripId)}`).then(r=>r.ok?r.json():null).then(data=>{if(active)setItems(data?.expenses??[])}).catch(()=>{});return()=>{active=false}},[tripId,refreshKey]);
 const today=new Date().toISOString().slice(0,10),todayItems=items.filter(item=>item.expenseDate===today),pending=items.filter(item=>item.status!=="ready").length,todayTotal=todayItems.reduce((sum,item)=>sum+(item.reportingAmountMinor??item.amountMinor),0),currency=todayItems[0]?.reportingCurrency??todayItems[0]?.currency??"TWD";
 return <section className="mobile-expense-overview" aria-label="手機報帳摘要"><div><span>今日費用</span><b>{todayItems.length} 筆</b><small>{todayTotal?`${currency} ${(todayTotal/100).toLocaleString()}`:"今天尚未上傳"}</small></div><div><span>待確認</span><b>{pending} 筆</b><small>{pending?"只處理例外":"目前已完成"}</small></div><p><b>最近費用</b><span>完整流水帳請回電腦版整理</span></p></section>;
}
