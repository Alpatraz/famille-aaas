import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, setDoc, doc, addDoc, deleteDoc
} from 'firebase/firestore'
import "../styles/profile.css"

const AVAILABLE_BLOCKS = {
  calendar: { name: 'Calendrier', icon: '📅' },
  tasks: { name: 'Tâches', icon: '✅' },
  homework: { name: 'Devoirs', icon: '📚' },
  meals: { name: 'Repas', icon: '🍽️' },
  karate: { name: 'Karaté', icon: '🥋' },
  messages: { name: 'Messages', icon: '💬' }
};

export default function ProfileSettings({ currentUser }) {
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState({})
  const [newMember, setNewMember] = useState({
    displayName: '',
    role: 'enfant',
    avatar: '🙂',
    color: '#cccccc',
    blocks: []
  })

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'))
    const allUsers = snap.docs.map(doc => ({
      id: doc.id,
      uid: doc.id,
      ...doc.data(),
      blocks: doc.data().blocks || []
    }))
    setUsers(allUsers)
  }

  useEffect(() => {
    loadUsers()
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
      const current = prev[uid] || { blocks: users.find(u => u.uid === uid)?.blocks || [] }
      const blocks = current.blocks || []
      return {
        ...prev,
        [uid]: {
          ...current,
          blocks: blocks.includes(block)
            ? blocks.filter(b => b !== block)
            : [...blocks, block]
        }
      }
    })
  }

  const toggleNewBlock = (block) => {
    setNewMember(prev => ({
      ...prev,
      blocks: prev.blocks.includes(block)
        ? prev.blocks.filter(b => b !== block)
        : [...prev.blocks, block]
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

  const handleDelete = async (user) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le profil de ${user.displayName} ?`)) {
      try {
        await deleteDoc(doc(db, 'users', user.id))
        await deleteDoc(doc(db, 'points', user.id))
        loadUsers()
        alert('✅ Profil supprimé avec succès')
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        alert('❌ Erreur lors de la suppression du profil')
      }
    }
  }

  const handleCreateUser = async () => {
    if (!newMember.displayName.trim()) return
    
    try {
      await addDoc(collection(db, 'users'), newMember)
      setNewMember({
        displayName: '',
        role: 'enfant',
        avatar: '🙂',
        color: '#cccccc',
        blocks: []
      })
      loadUsers()
      alert('✅ Nouveau membre ajouté avec succès')
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      alert('❌ Erreur lors de la création du profil')
    }
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

  const canManageUsers = currentUser?.role === 'admin'
  const canEditUsers = currentUser?.role === 'admin' || currentUser?.role === 'parent'

  return (
    <div className="dashboard-section">
      <div className="profile-header">
        <h2>👥 Gestion des profils</h2>
      </div>

      {canManageUsers && (
        <div className="new-member-form">
          <h3>➕ Ajouter un membre</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Prénom"
              value={newMember.displayName}
              onChange={e => setNewMember({ ...newMember, displayName: e.target.value })}
            />
            <select
              value={newMember.role}
              onChange={e => setNewMember({ ...newMember, role: e.target.value })}
            >
              <option value="enfant">👶 Enfant</option>
              <option value="parent">👨‍👩‍👧‍👦 Parent</option>
              {currentUser?.role === 'admin' && (
                <option value="admin">👑 Administrateur</option>
              )}
            </select>
            <input
              type="text"
              placeholder="Emoji avatar"
              value={newMember.avatar}
              onChange={e => setNewMember({ ...newMember, avatar: e.target.value })}
            />
            <input
              type="color"
              value={newMember.color}
              onChange={e => setNewMember({ ...newMember, color: e.target.value })}
            />
            {newMember.role === 'enfant' && (
              <div className="blocks-selector">
                <label>🔒 Accès aux fonctionnalités :</label>
                <div className="blocks-grid">
                  {Object.entries(AVAILABLE_BLOCKS).map(([key, block]) => (
                    <div
                      key={key}
                      className={`block-option ${newMember.blocks.includes(key) ? 'selected' : ''}`}
                      onClick={() => toggleNewBlock(key)}
                    >
                      {block.icon} {block.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleCreateUser} className="create-button">
              Créer le profil
            </button>
          </div>
        </div>
      )}

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
                disabled={!canEditUsers}
              />
            </div>

            <div className="tag" style={{ backgroundColor: user.color }}>
              {user.role === 'admin' ? '👑 Administrateur' :
               user.role === 'parent' ? '👨‍👩‍👧‍👦 Parent' : '👶 Enfant'}
            </div>

            {canEditUsers && (
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

                {canManageUsers && (
                  <label>
                    🎭 Rôle
                    <select
                      value={editing[user.uid]?.role || user.role}
                      onChange={e => handleChange(user.uid, 'role', e.target.value)}
                    >
                      <option value="enfant">👶 Enfant</option>
                      <option value="parent">👨‍👩‍👧‍👦 Parent</option>
                      {currentUser?.role === 'admin' && (
                        <option value="admin">👑 Administrateur</option>
                      )}
                    </select>
                  </label>
                )}

                {(user.role === 'enfant' || editing[user.uid]?.role === 'enfant') && (
                  <div className="blocks-selector">
                    <label>🔒 Accès aux fonctionnalités :</label>
                    <div className="blocks-grid">
                      {Object.entries(AVAILABLE_BLOCKS).map(([key, block]) => (
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
                )}

                <div className="profile-actions">
                  <button className="save-button" onClick={() => handleSave(user.uid)}>
                    ✅ Valider
                  </button>
                  {canManageUsers && (
                    <button className="delete-button" onClick={() => handleDelete(user)}>
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {currentUser?.role === 'admin' && (
        <button
          onClick={handleResetScores}
          className="reset-button"
        >
          🔄 Réinitialiser tous les scores et historiques
        </button>
      )}
    </div>
  )
}