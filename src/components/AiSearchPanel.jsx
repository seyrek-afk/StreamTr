import { Sparkles, X, Loader, CornerDownLeft } from 'lucide-react'
import ContentCard from './ContentCard.jsx'
import SkeletonGrid from './SkeletonGrid.jsx'
import { EXAMPLE_PROMPTS } from '../lib/aiQuery.js'

// "AI ile Ara" paneli — serbest metinle keşif.
//
// Boş bir metin kutusu kullanıcıya ne yazabileceğini anlatmaz; bu yüzden örnek
// istemler kutunun ALTINDA, tıklanabilir olarak durur. Örnekler bilinçli olarak
// farklı yetenekleri gösterir: ruh hâli + kalite + dönem, ülke + tema, izleme
// bağlamı (ailecek), on yıl + ülke + tür.
export default function AiSearchPanel({ ai, onClose }) {
  const { prompt, setPrompt, results, explain, loading, error, searched, run, clear } = ai

  const submit = () => { if (prompt.trim() && !loading) run(prompt) }

  return (
    <section className="ai-panel">
      <div className="ai-head">
        <div className="ai-title">
          <Sparkles size={14} />
          <span>AI ile Ara</span>
          <span className="ai-sub">ne izlemek istediğini kendi cümlelerinle yaz</span>
        </div>
        <button className="ai-close" onClick={() => { clear(); onClose?.() }} aria-label="AI aramayı kapat">
          <X size={14} />
        </button>
      </div>

      <div className="ai-input-wrap">
        <textarea
          className="ai-input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            // Enter gönderir, Shift+Enter yeni satır — uzun istemler yazılabilsin.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
          }}
          rows={2}
          maxLength={400}
          placeholder="Örn: Evde arkadaşlarla izleyeceğiz, puanı yüksek ama eski kült bir aksiyon filmi olsun"
        />
        <div className="ai-actions">
          <span className="ai-hint"><CornerDownLeft size={10} /> Enter ile ara</span>
          <button className="ai-submit" onClick={submit} disabled={!prompt.trim() || loading}>
            {loading ? <><Loader size={12} className="spin" /> Aranıyor…</> : <>Ara</>}
          </button>
        </div>
      </div>

      {/* Örnek istemler — yalnız henüz arama yapılmamışken; sonuçlar geldikten
          sonra ekranı meşgul etmelerinin bir faydası yok. */}
      {!searched && (
        <div className="ai-examples">
          {EXAMPLE_PROMPTS.map(ex => (
            <button key={ex} className="ai-example" onClick={() => { setPrompt(ex); run(ex) }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Ne anlaşıldı? — sistemin yorumunu göstermek, yanlış anladığında
          kullanıcının cümlesini düzeltmesini mümkün kılar. */}
      {searched && explain.length > 0 && (
        <div className="ai-explain">
          <span className="ai-explain-label">Anladığım:</span>
          {explain.map(e => (
            <span key={e.label} className="ai-chip">
              <span className="ai-chip-k">{e.label}</span>{e.value}
            </span>
          ))}
        </div>
      )}

      {loading && <SkeletonGrid count={6} />}

      {!loading && error && (
        <p className="ai-error">{error}</p>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="ai-count">{results.length} sonuç</p>
          <div className="grid-cards">
            {results.map((item, i) => (
              <div key={`ai-${item._mediaType}-${item._tmdbId}-${i}`} className="card-enter"
                style={{ animationDelay: `${Math.min(i * 0.03, 0.25)}s` }}>
                <ContentCard item={item} isTrend={false} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
