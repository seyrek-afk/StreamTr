import { X, Loader } from 'lucide-react'
import Dropdown from './Dropdown.jsx'
import { GENRES } from '../constants/index.js'

// Filtre kümesi — araç rayının sağ ucunda tek bir öbek.
//
// Öncesinde filtreler üç ayrı yatay-kaydırmalı çip satırına yayılıyordu
// (platform / tür + yıl / sıralama + pill). Hepsi açılır menüye toplandı;
// artık hepsi aynı kontrol ölçeğini (yükseklik, yarıçap, odak halkası) paylaşır
// ve "çerçeveli = filtre" kuralıyla eylemlerden ve kapsamdan ayrışır.
//
// Sonuç sayacı bilinçli olarak burada DEĞİL: o bir kontrol değil, listenin
// geri bildirimidir — ızgaranın başlığında durur.
export default function FilterBar({
  genres, onGenresChange,
  yearBuckets, selectedYears, onYearsChange,
  platforms, platform, onPlatformChange,
  sortOptions, sortBy, onSortChange,
  mediaType, onMediaTypeChange,
  trOnly, onTrOnlyChange, enriching,
  hasActiveFilter, onClear,
}) {
  return (
    <div className="toolbar-filters" role="group" aria-label="Filtreler">
      {onMediaTypeChange && (
        <Dropdown
          label="İçerik"
          value={mediaType === 'all' ? null : mediaType}
          onChange={v => onMediaTypeChange(v || 'all')}
          options={[
            { value: 'dizi', label: 'Dizi' },
            { value: 'film', label: 'Film' },
          ]}
          minWidth={100}
        />
      )}

      <Dropdown
        label="Tür"
        multi
        value={genres}
        onChange={onGenresChange}
        options={GENRES.map(g => ({ value: g, label: g }))}
        minWidth={96}
      />

      {yearBuckets.length > 0 && (
        <Dropdown
          label="Yıl"
          multi
          value={selectedYears}
          onChange={onYearsChange}
          options={yearBuckets.map(b => ({ value: b.key, label: b.label }))}
          minWidth={88}
        />
      )}

      <Dropdown
        label="Platform"
        value={platform === 'Tümü' ? null : platform}
        onChange={v => onPlatformChange(v || 'Tümü')}
        options={platforms.map(p => ({ value: p.id, label: p.label }))}
        minWidth={112}
      />

      <Dropdown
        label="Sırala"
        value={sortBy === 'default' ? null : sortBy}
        onChange={v => onSortChange(v || 'default')}
        options={sortOptions.filter(o => o.value !== 'default').map(o => ({ value: o.value, label: o.label }))}
        minWidth={104}
        align="right"
      />

      <button
        className={`ctl${trOnly ? ' ctl-on' : ''}`}
        onClick={() => onTrOnlyChange(!trOnly)}
        aria-pressed={trOnly}
        title="Yalnızca Türkiye'de yayın bilgisi bulunan yapımlar"
      >
        Yayında
        {trOnly && enriching && <Loader size={12} className="spin" aria-hidden="true" />}
      </button>

      {hasActiveFilter && (
        <button className="link-btn" onClick={onClear}>
          <X size={13} aria-hidden="true" /> Temizle
        </button>
      )}
    </div>
  )
}
