import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section>
        <span className="offline-logo">快</span>
        <p>快報 TripClaim</p>
        <h1>目前沒有網路</h1>
        <p>已上傳的資料不會因此消失。恢復連線後，請回到快報繼續處理。</p>
        <Link href="/">重新連線</Link>
      </section>
    </main>
  );
}
