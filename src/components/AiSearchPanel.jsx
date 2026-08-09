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
  const { prompt, setPrompt, results, explain, loading, error, searched, source, notice, run, clear } = ai

  const submit = () => { if (prompt.trim() && !loading) run(prompt) }

  return (
    <section className="ai-panel">
      <div className="ai-head">
        <h2 className="ai-title">
          <Sparkles size={20} aria-hidden="true" />
          AI ile Ara
          <span className="ai-sub">ne izlemek istediğini kendi cümlelerinle yaz</span>
        </h2>
        <button className="icon-btn" onClick={() => { clear(); onClose?.() }} aria-label="AI aramayı kapat">
          <X size={18} aria-hidden="true" />
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
          aria-label="Ne izlemek istediğini yaz"
          placeholder="Örn: Evde arkadaşlarla izleyeceğiz, puanı yüksek ama eski kült bir aksiyon filmi olsun"
        />
        <div className="ai-actions">
          <span className="ai-hint"><CornerDownLeft size={13} aria-hidden="true" /> Enter ile ara</span>
          <button className="btn" onClick={submit} disabled={!prompt.trim() || loading}>
            {loading ? <><Loader size={14} className="spin" aria-hidden="true" /> Aranıyor…</> : 'Ara'}
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

      {/* Yedeğe düşüldüyse sebebini söyle. Sessizce daha zayıf bir ayrıştırıcıya
          düşmek, kullanıcının sonucu yanlış yorumlamasına yol açardı. */}
      {searched && notice && !loading && (
        <p className="ai-notice">{notice}</p>
      )}

      {/* Ne anlaşıldı? — sistemin yorumunu göstermek, yanlış anladığında
          kullanıcının cümlesini düzeltmesini mümkün kılar. */}
      {searched && explain.length > 0 && (
        <div className="ai-explain">
          <span className="ai-explain-label">Anladığım:</span>
          {explain.map(e => (
            <span key={`${e.label}-${e.value}`} className="ai-chip">
              <span className="ai-chip-k">{e.label}</span>{e.value}
            </span>
          ))}
          {source === 'ai' && <span className="ai-source">AI</span>}
        </div>
      )}

      {loading && <SkeletonGrid count={6} />}

      {!loading && error && (
        <p className="ai-error">{error}</p>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="ai-count tnum">{results.length} sonuç</p>
          <div className="grid-cards enter">
            {results.map((item, i) => (
              <ContentCard key={`ai-${item._mediaType}-${item._tmdbId}-${i}`} item={item} isTrend={false} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
