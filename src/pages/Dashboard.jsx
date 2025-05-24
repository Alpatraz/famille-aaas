import { useState, useEffect } from 'react'
import TasksRewards from '../components/TasksRewards'
import Calendar from '../components/Calendar'
import AddEventModal from '../components/AddEventModal'
import EventPopup from '../components/EventPopup'
import Modal from '../components/Modal'
import MealPlanner from '../components/MealPlanner'
import Homework from '../components/Homework'
import TodoManager from '../components/TodoManager'
import Karate from '../components/Karate'
import { db } from '../firebase'
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore'

const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

export default function Dashboard({ user }) {
  const isParent = user.role === 'parent'
  const [showMealPlanner, setShowMealPlanner] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [popupEvent, setPopupEvent] = useState(null)
  const [repasJour, setRepasJour] = useState({})
  const [repasDemain, setRepasDemain] = useState({})
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])

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
      alert('Une erreur est survenue lors de la sauvegarde.')
    }
  }

  const handleDeleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, 'events', id))
      setEvents(prev => prev.filter(e => e.id !== id))
      setPopupEvent(null)
    } catch (error) {
      console.error('Erreur lors de la suppression :', error)
      alert('Une erreur est survenue lors de la suppression.')
    }
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setPopupEvent(null)
    setAddEventOpen(true)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-section full-width calendar-priority">
          <Calendar
            users={users}
            events={events}
            onEventClick={(e) => setPopupEvent(e)}
            onAddEvent={() => isParent && setAddEventOpen(true)}
          />
        </div>

        <div className="dashboard-section full-width">
          <h2>✅ Tâches & Récompenses</h2>
          {isParent ? (
            <div className="tasks-grid">
              {users
                .filter(u => u.role === 'enfant')
                .map((child) => (
                  <div key={child.id} className="child-task-card">
                    <h3>
                      <span>{child.avatar || '👤'}</span>
                      {child.displayName}
                    </h3>
                    <TasksRewards user={child} />
                  </div>
                ))}
            </div>
          ) : (
            <div className="dashboard-section" style={{ background: '#e9f5fe' }}>
              <TasksRewards user={user} />
            </div>
          )}
        </div>

        <div className="dashboard-section" onClick={() => setShowMealPlanner(true)}>
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
          <Homework />
        </div>

        <div className="dashboard-section">
          <TodoManager />
        </div>

        <div className="dashboard-section">
          <Karate user={user} />
        </div>

        <div className="dashboard-section full-width">
          <h2>💬 Mur de messages</h2>
          <p>Zone d'échange entre membres de la famille</p>
        </div>
      </div>

      {showMealPlanner && (
        <Modal title="🍽️ Repas de la semaine" onClose={() => setShowMealPlanner(false)}>
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
  );
}