export function Footer() {
  return (
    <footer>
      <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>PAWS — Professional Allied Workforce Services</div>
        <div>© {new Date().getFullYear()} · Real work that delivers.</div>
      </div>
    </footer>
  )
}
