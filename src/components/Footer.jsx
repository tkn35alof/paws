import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-wrap">
          <div className="foot-col">
            <h4 style={{ color: 'var(--paws-ink)', textTransform: 'none', letterSpacing: '-0.02em', fontSize: 18, fontWeight: 700 }}>
              PAWS<span style={{ color: 'var(--paws-pink)' }}>.</span>
            </h4>
            <p style={{ fontSize: 14, color: 'var(--paws-muted)', maxWidth: 280, marginTop: 8 }}>
              Professional Allied Workforce Services. A coordinated team of multi-skilled professionals delivering real work for international clients.
            </p>
          </div>
          <div className="foot-col">
            <h4>Team</h4>
            <Link to="/">The team</Link>
            <Link to="/projects">Work</Link>
            <Link to="/about">About</Link>
            <Link to="/mission">Mission</Link>
            <Link to="/vision">Vision</Link>
          </div>
          <div className="foot-col">
            <h4>Work with us</h4>
            <Link to="/contact">Contact</Link>
            <Link to="/portal">Member portal</Link>
            <a href="https://api.leadconnectorhq.com/widget/booking/YrYXL1dDWGNvci77AyUb" target="_blank" rel="noreferrer">Book a call</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} PAWS — Real work that delivers.</span>
          <span>Taipei · International</span>
        </div>
      </div>
    </footer>
  )
}
