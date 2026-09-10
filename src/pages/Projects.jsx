import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    const db = requireSupabase()
    ;(async () => {
      const [{ data: projData }, { data: memData }] = await Promise.all([
        db.from('projects').select('*').eq('published', true).order('display_order'),
        db.from('members').select('id, display_name').eq('published', true),
      ])
      setProjects(projData || [])
      setMembers(memData || [])
      setLoading(false)
    })()
  }, [])
  function teamNames(p) {
      if (!p.team_public) return []
      return (p.member_ids || []).map((id) => members.find((m) => m.id === id)?.display_name).filter(Boolean)
    }
  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Finished work</h1>
        {loading ? <p>Loading…</p> : projects.length === 0 ? <p>No projects published yet.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 28 }}>
            {projects.map((p) => {
              const team = teamNames(p)
              return (
                <div key={p.id} style={{ border: '1px solid var(--paws-line)', padding: 24 }}>
                  {p.cover_image && <img src={p.cover_image} alt={p.title} style={{ width: '100%', height: 180, objectFit: 'cover', marginBottom: 16 }} />}
                  <h3>{p.title}</h3>
                  <p style={{ color: 'var(--paws-muted)' }}>{p.summary}</p>
                  {team.length > 0 && (
                    <p style={{ marginTop: 12, fontSize: 13, color: 'var(--paws-muted)' }}>
                      <strong>Team:</strong> {team.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
