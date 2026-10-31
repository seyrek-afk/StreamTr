import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { DeviceProvider } from './contexts/DeviceContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { FavoritesProvider } from './contexts/FavoritesContext.jsx'
// Yazı tipleri KENDİ sunucumuzdan (fontsource paketleri, Vite hash'leyip
// assets/ altına koyar). Google Fonts CSS'i render'ı bloklayan üçüncü taraf
// istekti: DNS + TLS + CSS zinciri mobilde LCP'yi yarım saniyeden fazla
// geciktiriyordu ve CSP'de iki dış kaynak (googleapis, gstatic) açık kalıyordu.
// Yalnız kullanılan ağırlıklar; latin + latin-ext (Türkçe ş ğ ı İ latin-ext'te,
// tarayıcı unicode-range'e göre yalnız gerekeni indirir). İtalik dosya yok:
// iki yerdeki italik alıntı sentetik eğik çizilir, 117 KB'a değmez.
import '@fontsource/bebas-neue/latin.css'
import '@fontsource/bebas-neue/latin-ext.css'
import '@fontsource-variable/dm-sans/opsz.css'
import '@fontsource/sora/latin-600.css'
import '@fontsource/sora/latin-ext-600.css'
import '@fontsource/sora/latin-700.css'
import '@fontsource/sora/latin-ext-700.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <DeviceProvider>
        <AuthProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </AuthProvider>
      </DeviceProvider>
    </ThemeProvider>
  </React.StrictMode>
)
