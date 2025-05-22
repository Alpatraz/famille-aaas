import { useState, useEffect } from 'react'
import TasksRewards from '../components/TasksRewards'
import Calendar from '../components/Calendar'
import AddEventModal from '../components/AddEventModal'
import EventPopup from '../components/EventPopup'
import Modal from '../components/Modal'
import MealPlanner from '../components/MealPlanner'
import { db } from '../firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

const enfants = [
  { name: 'Antoine', uid: 'uid-Antoine', avatar: '🧒' },
  { name: 'Anna', uid: 'uid-Anna', avatar: '👧' },
  { name: 'Alexandre', uid: 'uid-Alexandre', avatar: '🧑' }
]

const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

export default function Dashboard({ user }) {
  const isParent = user.role === 'parent'
  const [open, setOpen] = useState(null)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [popupEvent, setPopupEvent] = useState(null)
  const [repasJour, setRepasJour] = useState({})
  const [repasDemain, setRepasDemain] = useState({})
  const [users, setUsers] = useState([])

  useEffect(() => {
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

    fetchMeals()
    fetchUsers()
  }, [])

  const handleSaveEvent = async (eventData) => {
    if (eventData.id) {
      console.log("Modifier :", eventData)
    } else {
      console.log("Ajouter :", eventData)
    }
    setAddEventOpen(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (id) => {
    console.log("Supprimer :", id)
    setPopupEvent(null)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setPopupEvent(null)
    setAddEventOpen(true)
  }

  return (
    <div>
      <h1>Tableau de bord familial</h1>

      <div className="dashboard-grid">
        {/* Bloc Calendrier */}
        <div className="dashboard-section full-width calendar-priority">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📅 Calendrier familial</h2>
            <button onClick={() => {
              setEditingEvent(null)
              setAddEventOpen(true)
            }}>➕ Ajouter un événement</button>
          </div>
          <Calendar
            users={users}
            onEventClick={(e) => setPopupEvent(e)}
          />
        </div>

        {/* Bloc Tâches & Récompenses */}
        <div className="dashboard-section full-width">
          <h2>✅ Tâches & Récompenses</h2>
          {isParent ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {enfants.map((child) => (
                <div key={child.name} className="dashboard-section" style={{ background: '#fffef8' }}>
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

        {/* Ligne 3 */}
        <div className="dashboard-section equal-block dashboard-clickable" onClick={() => setOpen('meals')}>
          <h2>🍽️ Repas de la semaine</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <p><strong>Aujourd’hui</strong><br />
                Lunch : {repasJour?.lunch?.join(', ') || '—'}<br />
                Souper : {repasJour?.souper?.join(', ') || '—'}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p><strong>Demain</strong><br />
                Lunch : {repasDemain?.lunch?.join(', ') || '—'}<br />
                Souper : {repasDemain?.souper?.join(', ') || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-section equal-block">
          <h2>🛒 Liste de courses</h2>
          <p>Ajouts favoris, historique familial</p>
        </div>

        <div className="dashboard-section equal-block">
          <h2>🥋 Karaté</h2>
          <p>Suivi des cours, compétitions, passages de ceinture</p>
        </div>

        <div className="dashboard-section full-width">
          <h2>💬 Mur de messages</h2>
          <p>Zone d’échange entre membres de la famille</p>
        </div>
      </div>

      {/* Modales */}
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
