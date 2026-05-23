# StreamTR 🎬

> Türkiye'deki streaming platformlarının en iyi dizi ve filmlerini keşfet.

**Netflix · Amazon Prime Video · Disney+ · Apple TV+**

Powered by **IMDB**, **Rotten Tomatoes** ve sosyal medya trendi verileriyle.

## Özellikler

- 📺 **En İyi Diziler** — IMDB puanına göre sıralı
- 🎬 **En İyi Filmler** — IMDB + Rotten Tomatoes puanları
- 🔥 **Sosyal Trend** — Twitter/X, Instagram, TikTok Türkiye gündem analizi
- 🏷️ **Çoklu Tür Filtresi** — Birden fazla tür seçerek filtreleme
- 📡 **Platform Filtresi** — Netflix, Prime, Disney+, Apple TV+
- 🔄 **Gerçek Zamanlı Veri** — Claude AI + web arama ile canlı veri

## Kurulum

```bash
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Yapı

```
streamtr/
├── src/
│   ├── App.jsx                  # Ana uygulama
│   ├── main.jsx                 # React entry point
│   ├── index.css                # Global stiller
│   ├── components/
│   │   ├── ContentCard.jsx      # Film/dizi kartı
│   │   ├── GenreFilter.jsx      # Çoklu tür filtresi
│   │   ├── PosterImg.jsx        # Poster görüntüsü
│   │   └── SkeletonGrid.jsx     # Yükleme iskelet ekranı
│   ├── hooks/
│   │   └── useStreamData.js     # API veri çekme hook'u
│   └── constants/
│       └── index.js             # Sabitler ve prompt'lar
├── index.html
├── vite.config.js
└── package.json
```

## Teknolojiler

- **React 18** + Vite
- **Claude Sonnet API** (web_search dahil)
- **Lucide React** ikonlar
- **TMDB** poster görselleri
