// İskelet ızgara — gerçek kartın geometrisini birebir taklit eder (poster 108px,
// yükseklik 162px). Ölçüler tutmazsa veri gelince düzen zıplıyor; iskelet tam da
// bunu önlemek için var.
// Vitrin iskeleti — HeroSlider'ın sınıflarını paylaşır (bkz. index.css
// .hslide-skeleton). Veri gelince vitrin bu kutunun yerine oturur; ızgara
// aşağı kaymaz. Ölçüldü: iskelet olmadan telefonda CLS 0.96'ydı.
export function HeroSkeleton() {
  return (
    <section className="hslider hslide-skeleton skeleton-animate" aria-hidden="true">
      <div className="hslide">
        <div className="hslide-body">
          <span style={{ width: '38%', height: 11 }} />
          <span style={{ width: '70%', height: 30 }} />
          <span style={{ width: '92%', height: 12 }} />
          <span style={{ width: '84%', height: 12 }} />
          <span style={{ width: '46%', height: 36, borderRadius: 10 }} />
        </div>
        <div className="hslide-media" />
      </div>
      <div className="hslide-nav"><span /></div>
    </section>
  )
}

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
