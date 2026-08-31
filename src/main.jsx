import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.jsx'
import TeamMember from './pages/TeamMember.jsx'
import { About, Mission, Vision } from './pages/About.jsx'
import Projects from './pages/Projects.jsx'
import Contact from './pages/Contact.jsx'
import Portal from './pages/Portal.jsx'
import Admin from './pages/Admin.jsx'
import Login from './pages/Login.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/team/:slug" element={<TeamMember />} />
        <Route path="/about" element={<About />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/vision" element={<Vision />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
