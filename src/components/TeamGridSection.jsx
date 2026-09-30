import { useEffect, useRef, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { gsap } from 'gsap'

export default function TeamGridSection() {
  const [members, setMembers] = useState([])
  const [activeId, setActiveId] = useState(null)
  const gridRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    ;(async () => {
      const { data } = await db.from('members')
        .select('*')
        .eq('published', true)
        .not('generated_avatar_url', 'is', null)
        .order('superiority_rank', { ascending: true })
      setMembers(data || [])
    })()
  }, [])

  useEffect(() => {
    if (members.length === 0) return
    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll('.team-card')
      if (!cards) return

      cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
          const id = card.dataset.id
          setActiveId(id)
          gsap.to(card, { scale: 1.05, brightness: 1.2, duration: 0.3, ease: 'power2.out' })
          cards.forEach((c) => {
            if (c.dataset.id !== id) {
              gsap.to(c, { scale: 0.92, brightness: 0.5, opacity: 0.6, duration: 0.3, ease: 'power2.out' })
            }
          })
        })
        card.addEventListener('mouseleave', () => {
          setActiveId(null)
          cards.forEach((c) => {
            gsap.to(c, { scale: 1, brightness: 1, opacity: 1, duration: 0.3, ease: 'power2.out' })
          })
        })
        card.addEventListener('click', () => {
          const id = card.dataset.id
          const member = members.find(m => m.id === id)
          if (!member) return

          gsap.to(card, {
            scale: 1.4,
            x: 80,
            y: -40,
            duration: 0.5,
            ease: 'power3.out',
          })
          cards.forEach((c) => {
            if (c.dataset.id !== id) {
              gsap.to(c, {
                scale: 0.7,
                x: -120,
                y: 60,
                opacity: 0,
                duration: 0.5,
                ease: 'power3.out',
              })
            }
          })
          gsap.fromTo(overlayRef.current,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.5, delay: 0.2, ease: 'power2.out' }
          )
        })
      })
    }, gridRef)
    return () => ctx.revert()
  }, [members])

  useEffect(() => {
    return () => {
      if (gridRef.current) {
        const cards = gridRef.current.querySelectorAll('.team-card')
        cards.forEach(c => {
          c.replaceWith(c.cloneNode(true))
        })
      }
    }
  }, [])

  if (members.length === 0) return null

  return (
    <section ref={gridRef} style={{ position: 'relative', padding: '80px 0' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 24,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        {members.map((m, i) => (
          <div
            key={m.id}
            data-id={m.id}
            className="team-card"
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: 16,
              overflow: 'hidden',
              background: 'rgba(14, 14, 24, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              aspectRatio: '3 / 4',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 16,
            }}
          >
            {m.generated_avatar_url ? (
              <img
                src={m.generated_avatar_url}
                alt={m.display_name}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--paws-paper-2)' }} />
            )}
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{m.display_name}</span>
            <span style={{ fontSize: 11, color: 'var(--paws-pink)', fontFamily: 'var(--font-mono)' }}>{m.tagline}</span>
          </div>
        ))}
      </div>
      <div
        ref={overlayRef}
        className="frosted-glass"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        <div style={{ pointerEvents: 'auto', maxWidth: 400, width: '90%', padding: '32px', background: 'rgba(14, 14, 24, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 20, color: '#fff' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
            {members.find(m => m.id === activeId)?.display_name}
          </h3>
          <p style={{ margin: '0 0 12px', color: 'var(--paws-pink)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            {members.find(m => m.id === activeId)?.tagline}
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, pointerEvents: 'auto' }}>
            {members.find(m => m.id === activeId)?.bio}
          </p>
        </div>
      </div>
    </section>
  )
}
