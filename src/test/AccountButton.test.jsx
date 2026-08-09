import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ThemeProvider } from '../contexts/ThemeContext.jsx'
import { THEMES } from '../constants/index.js'

// Oturum durumu testten teste değişiyor; useAuth taklit edilir.
let authState
vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => authState,
}))
// Modal bu testin konusu değil; açılıp açılmadığı ayrı test edilir.
vi.mock('../components/auth/AuthModal.jsx', () => ({
  default: ({ open }) => (open ? <div data-testid="auth-modal" /> : null),
}))

const { default: AccountButton } = await import('../components/auth/AccountButton.jsx')

const renderBtn = () => render(<ThemeProvider><AccountButton /></ThemeProvider>)
const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { expanded: false }))
  return screen.getByRole('menu')
}

beforeEach(() => {
  localStorage.clear()
  authState = { user: null, isAuthed: false, signOut: vi.fn() }
})

describe('AccountButton — oturum açmamış ziyaretçi', () => {
  // Tema bir HESAP ayarı değil, cihaz tercihi. Girişi olmayan ziyaretçiden
  // esirgemek için bir sebep yok; menü her iki durumda da açılmalı.
  it('menüyü açar ve tema seçimini gösterir', () => {
    renderBtn()
    const menu = openMenu()
    expect(within(menu).getByText('Tema')).toBeTruthy()
    for (const t of THEMES) {
      expect(within(menu).getByText(t.label), t.label).toBeTruthy()
    }
  })

  it('asıl eylem "Giriş yap" menünün ilk maddesidir', () => {
    renderBtn()
    const menu = openMenu()
    const items = within(menu).getAllByRole('menuitem')
    expect(items[0].textContent).toContain('Giriş yap')
  })

  it('"Giriş yap" giriş modalını açar', () => {
    renderBtn()
    const menu = openMenu()
    fireEvent.click(within(menu).getByText('Giriş yap'))
    expect(screen.getByTestId('auth-modal')).toBeTruthy()
  })

  it('çıkış maddesi gösterilmez', () => {
    renderBtn()
    const menu = openMenu()
    expect(within(menu).queryByText('Çıkış yap')).toBeNull()
  })
})

describe('AccountButton — oturum açmış kullanıcı', () => {
  beforeEach(() => {
    authState = {
      user: { name: 'Ozgur Seyrek', email: 'o@example.com' },
      isAuthed: true,
      signOut: vi.fn(),
    }
  })

  it('adı gösterir ve tema seçimi burada da vardır', () => {
    renderBtn()
    expect(screen.getByText('Ozgur Seyrek')).toBeTruthy()
    const menu = openMenu()
    expect(within(menu).getByText('Tema')).toBeTruthy()
    for (const t of THEMES) {
      expect(within(menu).getByText(t.label), t.label).toBeTruthy()
    }
  })

  it('çıkış maddesi vardır ve signOut çağırır', () => {
    renderBtn()
    const menu = openMenu()
    fireEvent.click(within(menu).getByText('Çıkış yap'))
    expect(authState.signOut).toHaveBeenCalled()
  })

  // AVATAR YOK — bilinçli karar (bkz. AccountButton başlık yorumu). Sağlayıcı
  // profil fotoğrafı gönderse bile gösterilmez; bu test kararı sabitler.
  it('profil fotoğrafı göstermez', () => {
    authState.user.avatarUrl = 'https://example.com/a.jpg'
    const { container } = renderBtn()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('AccountButton — tema seçimi davranışı', () => {
  it('seçim temayı uygular ve işaretler', () => {
    renderBtn()
    const menu = openMenu()
    fireEvent.click(within(menu).getByText('Netflix'))
    const netflix = within(menu).getByText('Netflix').closest('[role="menuitemradio"]')
    expect(netflix.getAttribute('aria-checked')).toBe('true')
    expect(localStorage.getItem('streamtr-theme')).toBe('netflix')
  })

  // Tema DENENEREK seçilir; her denemede menüyü kapatmak seçimi işkenceye
  // çevirirdi. Çoklu seçim açılır menüleriyle aynı kural.
  it('tema seçince menü KAPANMAZ', () => {
    renderBtn()
    const menu = openMenu()
    fireEvent.click(within(menu).getByText('Neon Siber'))
    expect(screen.queryByRole('menu')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('menu')).getByText('Cam Efekti'))
    expect(screen.queryByRole('menu')).toBeTruthy()
  })

  it('dışarı tıklayınca menü kapanır', () => {
    renderBtn()
    openMenu()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
