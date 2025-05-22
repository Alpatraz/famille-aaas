import './ChildCard.css'

export default function ChildCard({ name, points, children }) {
  return (
    <div className="child-card">
      <div className="child-header">
        <h3>{name}</h3>
        <div className="points-bar">
          <span className="points">{points} pts</span>
          <div className="bar">
            <div className="fill" style={{ width: `${Math.min(points, 100)}%` }}></div>
          </div>
        </div>
      </div>
      <div className="child-body">{children}</div>
    </div>
  )
}
