import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.jsx'
import { About, Mission, Vision } from './pages/About.jsx'
import Projects from './pages/Projects.jsx'
import Contact from './pages/Contact.jsx'
import Discovery from './pages/Discovery.jsx'
import Portal from './pages/Portal.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'
import PortfolioPage from './portfolio/PortfolioPage.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/vision" element={<Vision />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/discovery" element={<Discovery />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/portfolio/:slug/:page" element={<PortfolioPage />} />
        <Route path="/portfolio/:slug" element={<PortfolioPage />} />
        {/* Without this, any unknown URL renders a blank page — which is what
            a portfolio link pointing at a bad path used to do. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

/** Unknown route: show something rather than a white page. */
function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center',
      background: '#0b0b14', color: '#f5f5f8', padding: 24,
    }}>
      <div>
        <p style={{ fontSize: 44, margin: 0, color: '#ff5a8a' }}>404</p>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '10px 0 6px' }}>Page not found</h1>
        <p style={{ color: '#9a9aa5', margin: '0 0 20px' }}>
          That page doesn’t exist or the link is pointing somewhere else.
        </p>
        <Link
          className="btn"
          to="/"
          style={{
            display: 'inline-block', padding: '9px 18px', borderRadius: 999,
            border: '1px solid rgba(255,90,138,.55)', color: '#ff5a8a',
            textDecoration: 'none', fontSize: 14,
          }}
        >
          Back to PAWS
        </Link>
      </div>
    </div>
  )
}
// Cache bust Tue, Sep 29, 2026  3:57:48 PM
// Trigger deploy Wed, Sep 30, 2026  5:57:20 AM
// Force rebuild with env vars Wed, Sep 30, 2026  6:26:44 AM
