"use client";

import TripTodoPanel from "./TripTodoPanel";
import CompLeavePanel from "./CompLeavePanel";

export default function TripPreparation({tripId,onBookingSaved}:{tripId:string;onBookingSaved?:()=>void}){
 return <main className="trip-preparation-page">
  <header className="preparation-head"><div><span>Personal workspace</span><h1>我的行前準備</h1><p>自己的機票、住宿、待辦與補休集中在這裡；同行者不會因此看到你的私人報支資料。</p></div></header>
  <section className="preparation-grid">
   <TripTodoPanel tripId={tripId} onBookingSaved={onBookingSaved}/>
   <CompLeavePanel tripId={tripId}/>
  </section>
  <aside className="preparation-boundary panel"><b>資料邊界</b><p>機票／住宿同步後會投影到共同行程，但訂單附件與本人報支仍由來源資料管理，不在行程頁建立第二份可獨立修改的資料。</p></aside>
 </main>;
}
