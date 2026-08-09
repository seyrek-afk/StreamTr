// İskelet ızgara — gerçek kartın geometrisini birebir taklit eder (poster 108px,
// yükseklik 162px). Ölçüler tutmazsa veri gelince düzen zıplıyor; iskelet tam da
// bunu önlemek için var.
export default function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid-cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card skeleton-animate">
          <div className="skeleton-poster" />
          <div className="skeleton-body">
            <span style={{ width: '72%', height: 13 }} />
            <span style={{ width: '40%', height: 11 }} />
            <span style={{ width: '58%', height: 10 }} />
            <span style={{ width: '30%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
