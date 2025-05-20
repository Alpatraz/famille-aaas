import { useState } from 'react'
import TasksRewards from '../components/TasksRewards'
import Calendar from '../components/Calendar'
import AddEventModal from '../components/AddEventModal'
import Modal from '../components/Modal'

const enfants = [
  { name: 'Antoine', uid: 'uid-Antoine', avatar: '🧒' },
  { name: 'Anna', uid: 'uid-Anna', avatar: '👧' },
  { name: 'Alexandre', uid: 'uid-Alexandre', avatar: '🧑' }
]

export default function Dashboard({ user }) {
  const isParent = user.role === 'parent'
  const [open, setOpen] = useState(null)
  const [addEventOpen, setAddEventOpen] = useState(false)

  return (
    <div>
      <h1>Tableau de bord familial</h1>

      <div className="dashboard-grid">
        {/* --- Bloc Calendrier AVEC contenu --- */}
        <div className="dashboard-section full-width calendar-priority">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>📅 Calendrier familial</h2>
            <button onClick={() => setAddEventOpen(true)}>➕ Ajouter un événement</button>
          </div>
          <Calendar />
        </div>

        {/* --- Bloc Tâches & Récompenses --- */}
        <div className="dashboard-section full-width">
          <h2>✅ Tâches & Récompenses</h2>

          {isParent ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {enfants.map((child) => (
                <div key={child.name} className="dashboard-section" style={{ background: '#fffef8' }}>
                  <h3>{child.avatar} {child.name}</h3>
                  <TasksRewards user={{ uid: child.uid, displayName: child.name }} />
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

        {/* --- Repas --- */}
        <div className="dashboard-section" style={{ cursor: 'pointer' }} onClick={() => setOpen('meals')}>
          <h2>🍽️ Repas de la semaine</h2>
          <p>Lunchs, soirs, suggestions glissables…</p>
        </div>

        {/* --- Courses --- */}
        <div className="dashboard-section" style={{ cursor: 'pointer' }} onClick={() => setOpen('shopping')}>
          <h2>🛒 Liste de courses</h2>
          <p>Ajouts favoris, historique familial</p>
        </div>

        {/* --- Karaté --- */}
        <div className="dashboard-section" style={{ cursor: 'pointer' }} onClick={() => setOpen('karate')}>
          <h2>🥋 Karaté</h2>
          <p>Suivi des cours, compétitions, passages de ceinture</p>
        </div>

        {/* --- Messages --- */}
        <div className="dashboard-section" style={{ cursor: 'pointer' }} onClick={() => setOpen('messages')}>
          <h2>💬 Mur de messages</h2>
          <p>Zone d’échange entre membres de la famille</p>
        </div>
      </div>

      {/* --- Modales --- */}
      {open === 'meals' && (
        <Modal title="🍽️ Repas de la semaine" onClose={() => setOpen(null)}>
          <p>Lunchs et soupers par jour, suggestions, drag & drop.</p>
        </Modal>
      )}

      {open === 'shopping' && (
        <Modal title="🛒 Liste de courses" onClose={() => setOpen(null)}>
          <p>Liste collaborative par type et magasin, historique intelligent.</p>
        </Modal>
      )}

      {open === 'karate' && (
        <Modal title="🥋 Karaté" onClose={() => setOpen(null)}>
          <p>Historique des compétitions, progression, ceintures.</p>
        </Modal>
      )}

      {open === 'messages' && (
        <Modal title="💬 Mur familial" onClose={() => setOpen(null)}>
          <p>Messages internes visibles par tous, avec bulles et avatars.</p>
        </Modal>
      )}

      {/* Modal d’ajout d’événement */}
      {addEventOpen && (
        <AddEventModal onClose={() => setAddEventOpen(false)} />
      )}
    </div>
  )
}
