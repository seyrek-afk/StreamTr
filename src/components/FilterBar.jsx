import { X, Loader } from 'lucide-react'
import Dropdown from './Dropdown.jsx'
import { GENRES } from '../constants/index.js'

// Tek sıralık sakin filtre çubuğu.
//
// Öncesinde filtreler üç ayrı yatay-kaydırmalı çip satırına yayılıyordu
// (platform / tür + yıl / sıralama + pill). 12 tür + 6 yıl + 6 platform çipi
// başlığı şişirip içeriği ekranın altına itiyordu. Hepsi açılır menüye toplandı:
// yatay kaydırma bitti, yükseklik sabitlendi, seçili değerler tek bakışta okunur.
export default function FilterBar({
  genres, onGenresChange,
  yearBuckets, selectedYears, onYearsChange,
  platforms, platform, onPlatformChange,
  sortOptions, sortBy, onSortChange,
  mediaType, onMediaTypeChange,
  trOnly, onTrOnlyChange, enriching,
  shownCount, totalCount,
  hasActiveFilter, onClear,
}) {
  return (
    <div className="filter-bar">
      {onMediaTypeChange && (
        <Dropdown
          label="İçerik"
          value={mediaType === 'all' ? null : mediaType}
          onChange={v => onMediaTypeChange(v || 'all')}
          options={[
            { value: 'dizi', label: 'Dizi' },
            { value: 'film', label: 'Film' },
          ]}
          minWidth={104}
        />
      )}

      <Dropdown
        label="Tür"
        multi
        value={genres}
        onChange={onGenresChange}
        options={GENRES.map(g => ({ value: g, label: g }))}
        minWidth={104}
      />

      {yearBuckets.length > 0 && (
        <Dropdown
          label="Yıl"
          multi
          value={selectedYears}
          onChange={onYearsChange}
          options={yearBuckets.map(b => ({ value: b.key, label: b.label }))}
          minWidth={96}
        />
      )}

      <Dropdown
        label="Platform"
        value={platform === 'Tümü' ? null : platform}
        onChange={v => onPlatformChange(v || 'Tümü')}
        options={platforms.map(p => ({ value: p.id, label: p.label }))}
        minWidth={118}
      />

      <Dropdown
        label="Sırala"
        value={sortBy === 'default' ? null : sortBy}
        onChange={v => onSortChange(v || 'default')}
        options={sortOptions.filter(o => o.value !== 'default').map(o => ({ value: o.value, label: o.label }))}
        minWidth={112}
        align="right"
      />

      <button
        className={`fb-toggle${trOnly ? ' fb-toggle-on' : ''}`}
        onClick={() => onTrOnlyChange(!trOnly)}
        aria-pressed={trOnly}
        title="Yalnızca Türkiye'de yayın bilgisi bulunan yapımlar"
      >
        Yayındakiler
        {trOnly && enriching && <Loader size={9} className="spin" />}
      </button>

      <div className="fb-spacer" />

      <span className="fb-count">
        {shownCount} / {totalCount}
      </span>

      {hasActiveFilter && (
        <button className="fb-clear" onClick={onClear}>
          <X size={10} /> Temizle
        </button>
      )}
    </div>
  )
}
