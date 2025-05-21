import { useState } from 'react'

export default function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="accordion-section">
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <h4>{title}</h4>
        <span>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  )
}
