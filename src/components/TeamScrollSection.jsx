import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Canvas } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

function AvatarModel({ url, active, idx }) {
  // Guard: useGLTF is a hook — must not receive null. Return early before the hook.
  if (!url || typeof url !== 'string') return null

  const gltf = useGLTF(url)
  const meshRef = useRef(null)

  useEffect(() => {
    if (!meshRef.current) return
    if (active) {
      gsap.to(meshRef.current.position, { x: 0, y: 0, z: 0, scale: 1, duration: 0.8, ease: 'power3.out' })
    } else {
      const dir = idx % 2 === 0 ? -1 : 1
      gsap.to(meshRef.current.position, { x: dir * 6, y: -2, z: -2, scale: 0.6, duration: 0.6, ease: 'power2.out' })
    }
  }, [active, idx])

  return <primitive ref={meshRef} object={gltf.scene} scale={0.6} position={[6, 0, -2]} />
}

export default function TeamScrollSection({ members }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const trackRef = useRef(null)
  const textRef = useRef(null)

  // Filter: only members with a valid string URL for the 3D pipeline
  const activeAvatars = members.filter(
    (m) => m.generated_avatar_url && typeof m.generated_avatar_url === 'string'
  )

  useEffect(() => {
    if (activeAvatars.length === 0) return
    const ctx = gsap.context(() => {
      activeAvatars.forEach((_, i) => {
        const el = document.querySelector(`[data-member="${i}"]`)
        if (!el) return
        ScrollTrigger.create({
          trigger: el,
          onEnter: () => {
            setActiveIdx(i)
            gsap.to(textRef.current, { opacity: 0, duration: 0.25, onComplete: () => {
              gsap.fromTo(textRef.current, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.5, delay: 0.15 })
            }})
          },
          onLeave: () => gsap.to(textRef.current, { opacity: 0, duration: 0.25 }),
          onEnterBack: () => {
            setActiveIdx(i)
            gsap.to(textRef.current, { opacity: 0, duration: 0.25, onComplete: () => {
              gsap.fromTo(textRef.current, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.5 })
            }})
          },
          onLeaveBack: () => gsap.to(textRef.current, { opacity: 0, duration: 0.25 }),
        })
      })
    }, trackRef)
    return () => ctx.revert()
  }, [activeAvatars])

  if (activeAvatars.length === 0) {
    return (
      <section style={{ padding: '120px 0', textAlign: 'center' }}>
        <div className="wrap">
          <div className="kicker">The team</div>
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>Specialists, not freelancers.</h2>
          <p style={{ color: 'var(--paws-muted)', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Team avatars are being generated. Visit your profile page and toggle
            &ldquo;Update Homepage Avatar Head&rdquo; on save to create yours.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section ref={trackRef} style={{ position: 'relative', width: '100%' }}>
      {activeAvatars.map((m, i) => (
        <div key={m.id} data-member={i} style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
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
              <div ref={textRef} style={{
                position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)',
                maxWidth: 360, background: 'rgba(14, 14, 24, 0.7)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 16,
                padding: '32px 28px', color: '#fff', opacity: 0,
              }}>
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