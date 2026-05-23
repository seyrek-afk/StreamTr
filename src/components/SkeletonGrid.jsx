export default function SkeletonGrid({ count = 8 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 13 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-animate"
          style={{
            background: 'var(--bg-card)', borderRadius: 10, height: 148,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ width: 98, background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 12, width: '72%', background: 'rgba(255,255,255,0.055)', borderRadius: 3 }} />
              <div style={{ height: 10, width: '42%', background: 'rgba(255,255,255,0.035)', borderRadius: 3 }} />
              <div style={{ height: 9,  width: '58%', background: 'rgba(255,255,255,0.025)', borderRadius: 3 }} />
              <div style={{ height: 9,  width: '32%', background: 'rgba(255,255,255,0.035)', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
