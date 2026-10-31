import '@testing-library/jest-dom'

// jsdom'da matchMedia yok. Cihaz tanıma (useFormFactor) ve vitrin bunu çağırır;
// hiçbir sorgu eşleşmeyen nötr bir yedek veriyoruz. Kendi senaryosunu kuran test
// window.matchMedia'yı kendi mock'uyla ezer (bkz. useFormFactor.test.jsx).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
    dispatchEvent() { return false },
  })
}
