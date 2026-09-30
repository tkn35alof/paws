import { useEffect, useRef, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

function AvatarModel({ url, active, idx }) {
  const gltf = useGLTF(url)
  const meshRef = useRef(null)

  useEffect(() => {
    if (!meshRef.current) return
    if (active) {
      gsap.to(meshRef.current.position, {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
      })
    } else {
      const dir = idx % 2 === 0 ? -1 : 1
      gsap.to(meshRef.current.position, {
        x: dir * 6,
        y: -2,
        z: -2,
        scale: 0.6,
        duration: 0.6,
        ease: 'power2.out',
      })
    }
  }, [active, idx])

  return (
    <primitive ref={meshRef} object={gltf.scene} scale={0.6} position={[6, 0, -2]} />
  )
}

export default function TeamScrollSection() {
  const [members, setMembers] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const trackRef = useRef(null)
  const textRef = useRef(null)

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
      members.forEach((_, i) => {
        const el = document.querySelector(`[data-member="${i}"]`)
        if (!el) return
        ScrollTrigger.create({
          trigger: el,
          onEnter: () => {
            setActiveIdx(i)
            gsap.to(textRef.current, { opacity: 0, duration: 0.25, onComplete: () => {
              gsap.fromTo(textRef.current,
                { opacity: 0, x: 40 },
                { opacity: 1, x: 0, duration: 0.5, delay: 0.15 }
              )
            }})
          },
          onLeave: () => {
            gsap.to(textRef.current, { opacity: 0, duration: 0.25 })
          },
          onEnterBack: () => {
            setActiveIdx(i)
            gsap.to(textRef.current, { opacity: 0, duration: 0.25, onComplete: () => {
              gsap.fromTo(textRef.current, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.5 })
            }})
          },
          onLeaveBack: () => {
            gsap.to(textRef.current, { opacity: 0, duration: 0.25 })
          },
        })
      })
    }, trackRef)
    return () => ctx.revert()
  }, [members])

  if (members.length === 0) return null

  return (
    <section ref={trackRef} style={{ position: 'relative', width: '100%' }}>
      {members.map((m, i) => (
        <div
          key={m.id}
          data-member={i}
          style={{
            position: 'relative',
            height: '100vh',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%' }}>
            <Canvas
              camera={{ position: [0, 0, 8], fov: 45 }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 5, 4]} intensity={1.2} />
              <AvatarModel url={m.generated_avatar_url} active={activeIdx === i} idx={i} />
            </Canvas>
            {activeIdx === i && (
              <div
                ref={textRef}
                style={{
                  position: 'absolute',
                  right: 60,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  maxWidth: 360,
                  background: 'rgba(14, 14, 24, 0.7)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 16,
                  padding: '32px 28px',
                  color: '#fff',
                  opacity: 0,
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>{m.display_name}</h3>
                <p style={{ margin: '0 0 12px', color: 'var(--paws-pink)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>{m.tagline}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6 }}>{m.bio}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}