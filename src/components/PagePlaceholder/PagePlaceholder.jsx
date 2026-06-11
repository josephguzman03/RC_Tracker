import './PagePlaceholder.css'

export default function PagePlaceholder({ title, label }) {
  return (
    <div className="page-placeholder">
      <span className="placeholder-label">{label}</span>
      <h2 className="placeholder-title">{title}</h2>
      <span className="placeholder-phase">Coming in a future phase</span>
    </div>
  )
}