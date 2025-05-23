import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TasksRewards from '../components/TasksRewards'
import Calendar from '../components/Calendar'
import AddEventModal from '../components/AddEventModal'
import EventPopup from '../components/EventPopup'
import Modal from '../components/Modal'
import MealPlanner from '../components/MealPlanner'
import { db, auth } from '../firebase'
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

const enfants = [
  { name: 'Antoine', uid: 'uid-Antoine', avatar: '🧒', color: '#FFE0E0' },
  { name: 'Anna', uid: 'uid-Anna', avatar: '👧', color: '#E0F4FF' },
  { name: 'Alexandre', uid: 'uid-Alexandre', avatar: '🧑', color: '#E8FFE0' }
]

const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const isParent = user.role === 'parent'
  const [open, setOpen] = useState(null)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [popupEvent, setPopupEvent] = useState(null)
  const [repasJour, setRepasJour] = useState({})
  const [repasDemain, setRepasDemain] = useState({})
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsSnap = await getDocs(collection(db, 'events'))
      const eventsData = eventsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.()?.toISOString?.().split('T')[0] || doc.data().date
      }))
      setEvents(eventsData)
    }

    const fetchMeals = async () => {
      const ref = doc(db, 'repas', 'semaine')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        const today = jours[new Date().getDay()]
        const tomorrow = jours[(new Date().getDay() + 1) % 7]
        setRepasJour(data[today.charAt(0).toUpperCase() + today.slice(1)] || {})
        setRepasDemain(data[tomorrow.charAt(0).toUpperCase() + tomorrow.slice(1)] || {})
      }
    }

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setUsers(data)
    }

    fetchEvents()
    fetchMeals()
    fetchUsers()
  }, [])

  const handleSaveEvent = async (eventData) => {
    try {
      if (eventData.id) {
        await updateDoc(doc(db, 'events', eventData.id), {
          title: eventData.title,
          date: eventData.date,
          duration: eventData.duration,
          participants: eventData.participants,
          type: eventData.type
        })
        setEvents(prev => prev.map(e => 
          e.id === eventData.id ? { ...eventData } : e
        ))
      } else {
        const docRef = await addDoc(collection(db, 'events'), {
          title: eventData.title,
          date: eventData.date,
          duration: eventData.duration,
          participants: eventData.participants,
          type: eventData.type
        })
        setEvents(prev => [...prev, { ...eventData, id: docRef.id }])
      }
      setAddEventOpen(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error)
      alert('Une erreur est survenue lors de la sauvegarde de l\'événement.')
    }
  }

  const handleDeleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, 'events', id))
      setEvents(prev => prev.filter(e => e.id !== id))
      setPopupEvent(null)
    } catch (error) {
      console.error('Erreur lors de la suppression :', error)
      alert('Une erreur est survenue lors de la suppression de l\'événement.')
    }
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setPopupEvent(null)
    setAddEventOpen(true)
  }

  return (
    <div className="dashboard">
      <div className="welcome-banner">
        <h1>Tableau de bord Famille AAA's</h1>
        <div className="user-info">
          <span className="user-name">{user.displayName || user.email}</span>
          <span className="role-tag">Rôle : {user.role}</span>
          <button onClick={handleLogout} className="logout-button">👋 Déconnexion</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section full-width calendar-priority">
          <div className="calendar-header">
            <h2>📅 Calendrier Familial</h2>
            {isParent && (
              <button className="add-event-button" onClick={() => setAddEventOpen(true)}>
                ➕ Ajouter un événement
              </button>
            )}
          </div>
          <Calendar
            users={users}
            events={events}
            onEventClick={(e) => setPopupEvent(e)}
          />
        </div>

        <div className="dashboard-section full-width">
          <h2>✅ Tâches & Récompenses</h2>
          {isParent ? (
            <div className="tasks-grid">
              {enfants.map((child) => (
                <div 
                  key={child.name} 
                  className="child-task-card"
                  style={{
                    backgroundColor: `${child.color}22`,
                    borderLeft: `4px solid ${child.color}`
                  }}
                >
                  <h3>{child.avatar} {child.name}</h3>
                  <TasksRewards user={{ uid: child.uid, displayName: child.name, avatar: child.avatar }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-section" style={{ background: '#e9f5fe' }}>
              <h3>👤 {user.displayName}</h3>
              <TasksRewards user={user} />
            </div>
          )}
        </div>

        <div className="dashboard-section" onClick={() => setOpen('meals')}>
          <h2>🍽️ Repas de la semaine</h2>
          <div className="meals-preview">
            <div className="meal-day">
              <h4>Aujourd'hui</h4>
              <p>Lunch : {repasJour?.lunch?.join(', ') || '—'}</p>
              <p>Souper : {repasJour?.souper?.join(', ') || '—'}</p>
            </div>
            <div className="meal-day">
              <h4>Demain</h4>
              <p>Lunch : {repasDemain?.lunch?.join(', ') || '—'}</p>
              <p>Souper : {repasDemain?.souper?.join(', ') || '—'}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>🛒 Liste de courses</h2>
          <p>Ajouts favoris, historique familial</p>
        </div>

        <div className="dashboard-section">
          <h2>🥋 Karaté</h2>
          <p>Suivi des cours, compétitions, passages de ceinture</p>
        </div>

        <div className="dashboard-section full-width">
          <h2>💬 Mur de messages</h2>
          <p>Zone d'échange entre membres de la famille</p>
        </div>
      </div>

      {open === 'meals' && (
        <Modal title="🍽️ Repas de la semaine" onClose={() => setOpen(null)}>
          <MealPlanner />
        </Modal>
      )}

      {addEventOpen && (
        <AddEventModal
          onClose={() => {
            setAddEventOpen(false)
            setEditingEvent(null)
          }}
          onSave={handleSaveEvent}
          users={users}
          initialData={editingEvent}
        />
      )}

      {popupEvent && (
        <EventPopup
          event={popupEvent}
          users={users}
          onClose={() => setPopupEvent(null)}
          onDelete={handleDeleteEvent}
          onEdit={handleEditEvent}
        />
      )}
    </div>
  )
}