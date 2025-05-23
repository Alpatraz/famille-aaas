import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, setDoc, doc, addDoc, deleteDoc
} from 'firebase/firestore'
import "../styles/profile.css"

const DASHBOARD_BLOCKS = {
  tasks: { name: 'Tâches & Récompenses', icon: '✅' },
  calendar: { name: 'Calendrier', icon: '📅' },
  meals: { name: 'Repas', icon: '🍽️' },
  homework: { name: 'Devoirs', icon: '📚' },
  karate: { name: 'Karaté', icon: '🥋' },
  messages: { name: 'Messages', icon: '💬' }
};

const ROLES = {
  admin: { name: 'Administrateur', icon: '👑' },
  parent: { name: 'Parent', icon: '👨‍👩‍👧‍👦' },
  enfant: { name: 'Enfant', icon: '👶' }
};

export default function ProfileSettings() {
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState({})
  const [currentUser, setCurrentUser] = useState(null)

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('enfant')
  const [newAvatar, setNewAvatar] = useState('🙂')
  const [newColor, setNewColor] = useState('#cccccc')
  const [newBlocks, setNewBlocks] = useState([])

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'))
    const allUsers = snap.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      blocks: [],
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

  const toggleBlock = (uid, block) => {
    setEditing(prev => {
      const currentBlocks = prev[uid]?.blocks || []
      const newBlocks = currentBlocks.includes(block)
        ? currentBlocks.filter(b => b !== block)
        : [...currentBlocks, block]
      
      return {
        ...prev,
        [uid]: {
          ...prev[uid],
          blocks: newBlocks
        }
      }
    })
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
      avatar: newAvatar,
      blocks: newBlocks
    })
    setNewName('')
    setNewRole('enfant')
    setNewColor('#cccccc')
    setNewAvatar('🙂')
    setNewBlocks([])
    loadUsers()
  }

  const handleResetScores = async () => {
    const confirmReset = window.confirm(
      "Êtes-vous sûr de vouloir réinitialiser tous les scores ET supprimer l'historique de chaque membre ? Cette action est irréversible."
    )
    if (!confirmReset) return

    try {
      for (const u of users) {
        await setDoc(doc(db, 'points', u.uid), { value: 0 }, { merge: true })
        const userHistoryDoc = doc(db, 'taskHistory', u.uid)
        const daysCollections = await db._delegate.listCollections(userHistoryDoc)
        for (const dayCol of daysCollections) {
          const entriesSnap = await getDocs(dayCol)
          for (const d of entriesSnap.docs) {
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

  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'parent'

  return (
    <div className="dashboard-section">
      <h2>👥 Gestion des profils</h2>

      <div className="profile-grid">
        {users.map(user => (
          <div key={user.uid} className="profile-card" style={{ borderColor: user.color }}>
            <div className="profile-header">
              <div className="profile-avatar">
                {editing[user.uid]?.avatar || user.avatar || '🙂'}
              </div>
              <input
                className="profile-name"
                value={editing[user.uid]?.displayName ?? user.displayName}
                onChange={e => handleChange(user.uid, 'displayName', e.target.value)}
                disabled={!canManageUsers}
              />
            </div>

            <div className="tag" style={{ backgroundColor: user.color }}>
              {ROLES[user.role]?.icon} {ROLES[user.role]?.name}
            </div>

            {canManageUsers && (
              <>
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
                    {Object.entries(ROLES).map(([key, role]) => (
                      <option key={key} value={key}>
                        {role.icon} {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="blocks-selector">
                  <label>📱 Blocs visibles</label>
                  <div className="blocks-grid">
                    {Object.entries(DASHBOARD_BLOCKS).map(([key, block]) => (
                      <div
                        key={key}
                        className={`block-option ${(editing[user.uid]?.blocks || user.blocks || []).includes(key) ? 'selected' : ''}`}
                        onClick={() => toggleBlock(user.uid, key)}
                      >
                        {block.icon} {block.name}
                      </div>
                    ))}
                  </div>
                </div>

                <button className="save-button" onClick={() => handleSave(user.uid)}>
                  ✅ Valider
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {canManageUsers && (
        <>
          <h3 className="section-title">➕ Ajouter un membre</h3>
          <div className="profile-card new-profile">
            <input
              placeholder="Prénom"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
              {Object.entries(ROLES).map(([key, role]) => (
                <option key={key} value={key}>
                  {role.icon} {role.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Emoji avatar"
              value={newAvatar}
              onChange={e => setNewAvatar(e.target.value)}
            />
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
            />
            <div className="blocks-selector">
              <label>📱 Blocs visibles</label>
              <div className="blocks-grid">
                {Object.entries(DASHBOARD_BLOCKS).map(([key, block]) => (
                  <div
                    key={key}
                    className={`block-option ${newBlocks.includes(key) ? 'selected' : ''}`}
                    onClick={() => setNewBlocks(prev => 
                      prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key]
                    )}
                  >
                    {block.icon} {block.name}
                  </div>
                ))}
              </div>
            </div>
            <button className="save-button" onClick={handleCreateUser}>
              ➕ Créer
            </button>
          </div>

          {currentUser?.role === 'admin' && (
            <button
              onClick={handleResetScores}
              className="reset-button"
            >
              🔄 Réinitialiser tous les scores et historiques
            </button>
          )}
        </>
      )}
    </div>
  )
}