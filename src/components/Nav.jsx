import { Link } from 'react-router-dom'
export function Nav() {
  return (
    <nav className="nav">
      <Link className="brand" to="/">PAWS</Link>
      <Link to="/">Team</Link>
      <Link to="/projects">Work</Link>
      <Link to="/about">About</Link>
      <Link to="/mission">Mission</Link>
      <Link to="/vision">Vision</Link>
      <Link to="/contact">Contact</Link>
      <Link to="/portal">Portal</Link>
    </nav>
  )
}
