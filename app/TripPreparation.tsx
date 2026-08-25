"use client";

import TripTodoPanel from "./TripTodoPanel";
import CompLeavePanel from "./CompLeavePanel";

export default function TripPreparation({tripId,onBookingSaved}:{tripId:string;onBookingSaved?:()=>void}){
 return <main className="trip-preparation-page">
  <header className="preparation-head"><div><span>我的行前準備</span><h1>行前準備</h1><p>自己的機票、住宿、待辦與補休在這裡完成；也可以查看同行者是否已準備好，但看不到他們的原始文件或個人報支。</p></div></header>
  <section className="preparation-grid">
   <TripTodoPanel tripId={tripId} onBookingSaved={onBookingSaved}/>
   <CompLeavePanel tripId={tripId}/>
  </section>
  <aside className="preparation-boundary panel"><b>同步到行程的內容</b><p>機票與住宿確認後，只把起訖時間與必要行程資訊同步到共同行程；原始附件與本人的報支資料仍留在自己的工作區，同行者只看到完成狀態與需要共用的行程資訊。</p></aside>
 </main>;
}
