import { useMemo } from 'react'

/**
 * Generic editor for a portfolio page's content.
 *
 * The regions descriptor (public/portfolio-assets/regions/<page>.json) drives
 * the form: every text, image and link region becomes a field, grouped by the
 * section it belongs to in the replica.
 */
export default function PortfolioEditor({ page, content, regions, onChange, disabled }) {
  const sections = useMemo(() => {
    const map = new Map()
    for (const r of regions || []) {
      const name = r.section || 'Content'
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(r)
    }
    return [...map.entries()]
  }, [regions])

  function setKey(key, value) {
    onChange({ ...(content || {}), [key]: value })
  }

  if (!regions?.length) {
    return <p style={{ color: 'var(--paws-muted)' }}>No editable regions for this page.</p>
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {sections.map(([section, regs]) => (
        <section key={section}>
          <h3 style={{
            margin: '0 0 12px', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--paws-pink)',
          }}>
            {section}
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {regs.map((r) => (
              <RegionField
                key={r.key}
                region={r}
                value={content?.[r.key]}
                disabled={disabled}
                onChange={(v) => setKey(r.key, v)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function RegionField({ region, value, disabled, onChange }) {
  const { type, label } = region

  if (type === 'image') {
    const v = value || {}
    return (
      <div>
        <Label>{label}</Label>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            style={inputStyle}
            value={v.src || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...v, src: e.target.value })}
            placeholder="/portfolio-assets/…"
          />
          <input
            style={inputStyle}
            value={v.alt || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...v, alt: e.target.value })}
            placeholder="Alt text"
          />
        </div>
      </div>
    )
  }

  if (type === 'link') {
    const v = value || {}
    return (
      <div>
        <Label>{label}</Label>
        <div style={{ display: 'grid', gap: 8 }}>
          {typeof v.label === 'string' && (
            <input
              style={inputStyle}
              value={v.label}
              disabled={disabled}
              onChange={(e) => onChange({ ...v, label: e.target.value })}
              placeholder="Label"
            />
          )}
          <input
            style={inputStyle}
            value={v.href || ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...v, href: e.target.value })}
            placeholder="https://…"
          />
        </div>
      </div>
    )
  }

  const text = typeof value === 'string' ? value : ''
  const long = text.length > 90
  return (
    <div>
      <Label>{label}</Label>
      {long ? (
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 76 }}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          style={inputStyle}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

function Label({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: 'var(--paws-muted)', marginBottom: 5 }}>
      {children}
    </label>
  )
}

const inputStyle = {
  font: 'inherit',
  fontSize: 14,
  padding: '9px 12px',
  border: '1px solid var(--paws-line)',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(14,14,24,0.6)',
  color: 'var(--paws-ink)',
  width: '100%',
  boxSizing: 'border-box',
}
