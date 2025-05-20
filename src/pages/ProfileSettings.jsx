import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, setDoc, doc, addDoc, deleteDoc
} from 'firebase/firestore'
import "../styles/profile.css"

export default function ProfileSettings() {
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState({})
  const [currentUser, setCurrentUser] = useState(null)

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('enfant')
  const [newAvatar, setNewAvatar] = useState('🙂')
  const [newColor, setNewColor] = useState('#cccccc')

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'))
    const allUsers = snap.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      ...doc.data()
    }))
    setUsers(allUsers)
  }

  useEffect(() => {
    loadUsers()
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setCurrentUser(parsed)
    }
  }, [])

  const handleChange = (uid, field, value) => {
    setEditing(prev => ({
      ...prev,
      [uid]: {
        ...prev[uid],
        [field]: value
      }
    }))
  }

  const handleSave = async (uid) => {
    const updated = editing[uid]
    if (updated) {
      await setDoc(doc(db, 'users', uid), updated, { merge: true })
      setEditing(prev => {
        const copy = { ...prev }
        delete copy[uid]
        return copy
      })
      loadUsers()
      alert('✅ Modifications enregistrées')
    }
  }

  const handleCreateUser = async () => {
    if (!newName.trim()) return
    await addDoc(collection(db, 'users'), {
      displayName: newName.trim(),
      role: newRole,
      color: newColor,
      avatar: newAvatar
    })
    setNewName('')
    setNewRole('enfant')
    setNewColor('#cccccc')
    setNewAvatar('🙂')
    loadUsers()
  }

  const handleResetScores = async () => {
    const confirmReset = window.confirm(
      "Êtes-vous sûr de vouloir réinitialiser tous les scores ET supprimer l'historique de chaque membre ? Cette action est irréversible."
    )
    if (!confirmReset) return

    try {
      for (const u of users) {
        // Réinitialise les points
        await setDoc(doc(db, 'points', u.uid), { value: 0 }, { merge: true })

        // Supprime l’historique : toutes les sous-collections de taskHistory/{uid}/{day}
        const historyRoot = collection(db, 'taskHistory', u.uid)
        const daysSnap = await getDocs(historyRoot)
        for (const dayDoc of daysSnap.docs) {
          const day = dayDoc.id
          const subCol = collection(db, 'taskHistory', u.uid, day)
          const subSnap = await getDocs(subCol)
          for (const d of subSnap.docs) {
            await deleteDoc(d.ref)
          }
        }
      }

      alert('✅ Scores et historiques réinitialisés avec succès.')
    } catch (err) {
      console.error('❌ Erreur lors de la réinitialisation :', err)
      alert('Erreur lors de la réinitialisation.')
    }
  }

  return (
    <div className="dashboard-section">
      <h2>👥 Gestion des profils</h2>

      <div className="profile-grid">
        {users.map(user => (
          <div key={user.uid} className="profile-card" style={{ borderColor: user.color }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="profile-avatar">
                {editing[user.uid]?.avatar || user.avatar || '🙂'}
              </div>
              <input
                value={editing[user.uid]?.displayName ?? user.displayName}
                onChange={e => handleChange(user.uid, 'displayName', e.target.value)}
              />
            </div>

            <div className="tag" style={{ backgroundColor: user.color }}>
              {user.role}
            </div>

            <label>
              🎨 Couleur
              <input
                type="color"
                value={editing[user.uid]?.color || user.color || '#ccc'}
                onChange={e => handleChange(user.uid, 'color', e.target.value)}
              />
            </label>

            <label>
              🧸 Avatar
              <input
                value={editing[user.uid]?.avatar || user.avatar || ''}
                onChange={e => handleChange(user.uid, 'avatar', e.target.value)}
              />
            </label>

            <label>
              🎭 Rôle
              <select
                value={editing[user.uid]?.role || user.role}
                onChange={e => handleChange(user.uid, 'role', e.target.value)}
              >
                <option value="enfant">Enfant</option>
                <option value="parent">Parent</option>
              </select>
            </label>

            <button onClick={() => handleSave(user.uid)}>✅ Valider</button>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: '2rem' }}>➕ Ajouter un membre</h3>
      <div className="profile-card" style={{ borderColor: newColor }}>
        <input
          placeholder="Prénom"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <select value={newRole} onChange={e => setNewRole(e.target.value)}>
          <option value="enfant">Enfant</option>
          <option value="parent">Parent</option>
        </select>
        <input
          placeholder="Emoji ou URL image"
          value={newAvatar}
          onChange={e => setNewAvatar(e.target.value)}
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
        />
        <button onClick={handleCreateUser}>Créer</button>
      </div>

      {(currentUser?.role === 'parent' || users.some(u => u.displayName === 'Guillaume' && u.role === 'parent')) && (
        <button
          onClick={handleResetScores}
          style={{
            marginTop: '2rem',
            backgroundColor: '#ffecec',
            border: '1px solid red',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}
        >
          🔄 Réinitialiser tous les scores et historiques
        </button>
      )}
    </div>
  )
}
