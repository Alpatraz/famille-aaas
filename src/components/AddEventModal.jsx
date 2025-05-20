// src/components/AddEventModal.jsx
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import '../styles/addEventModal.css'

export default function AddEventModal({ onClose }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [duration, setDuration] = useState(60)
  const [participants, setParticipants] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setUsers(list)
    }
    fetchUsers()
  }, [])

  const toggleParticipant = (uid) => {
    setParticipants(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const handleSubmit = async () => {
    if (!title || !date || !startTime || participants.length === 0) return alert('Veuillez remplir tous les champs')

    await addDoc(collection(db, 'calendarEvents'), {
      title,
      date, // Format yyyy-MM-dd
      startTime,
      duration: Number(duration),
      participants,
      createdAt: new Date()
    })

    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>➕ Nouvel événement</h2>

        <label>Titre</label>
        <input value={title} onChange={e => setTitle(e.target.value)} />

        <label>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />

        <label>Heure de début</label>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />

        <label>Durée (min)</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />

        <label>Participants</label>
        <div className="participant-list">
          {users.map(user => (
            <label key={user.id}>
              <input
                type="checkbox"
                checked={participants.includes(user.id)}
                onChange={() => toggleParticipant(user.id)}
              /> {user.avatar || '🙂'} {user.displayName}
            </label>
          ))}
        </div>

        <div className="modal-buttons">
          <button onClick={handleSubmit}>Enregistrer</button>
          <button onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
