import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import '../styles/Calendar.css'

const HOURS = Array.from({ length: 15 }, (_, i) => 7 + i) // 7h à 21h
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function CalendarView() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const fetchEvents = async () => {
      const snap = await getDocs(collection(db, 'calendarEvents'))
      const data = snap.docs.map(doc => doc.data())
      setEvents(data)
    }
    fetchEvents()
  }, [])

  const getDayIndex = (day) => {
    const map = { 'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4, 'samedi': 5, 'dimanche': 6 }
    return map[day.toLowerCase()]
  }

  return (
    <div className="calendar-container">
      <div className="calendar-grid">
        {/* --- Colonne des heures --- */}
        <div className="time-col">
          <div className="header"></div>
          {HOURS.map(h => (
            <div key={h} className="time-cell">{h}h</div>
          ))}
        </div>

        {/* --- Colonnes par jour --- */}
        {DAYS.map((day, i) => (
          <div className="day-col" key={i}>
            <div className="header">{day}</div>
            {HOURS.map((_, h) => (
              <div key={h} className="day-cell"></div>
            ))}

            {/* --- Affichage des événements pour ce jour --- */}
            {events
              .filter(e => getDayIndex(e.day) === i)
              .map((event, idx) => {
                const top = (event.hour - 7) * 60
                const height = event.duration * 60
                return (
                  <div
                    key={idx}
                    className="event-block"
                    style={{
                      top,
                      height,
                      backgroundColor: event.color || '#607d8b'
                    }}
                  >
                    {event.icon || '📌'} {event.title}
                  </div>
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
