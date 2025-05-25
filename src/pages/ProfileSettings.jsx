import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { 
  sendPasswordResetEmail, 
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword 
} from 'firebase/auth'
import {
  collection, getDocs, setDoc, doc, addDoc, deleteDoc
} from 'firebase/firestore'
import "../styles/profile.css"

export default function ProfileSettings() {
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [resetStatus, setResetStatus] = useState({ loading: false, message: '', error: false })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('enfant')
  const [newAvatar, setNewAvatar] = useState('🙂')
  const [newColor, setNewColor] = useState('#cccccc')
  const [newPracticesKarate, setPracticesKarate] = useState(false)

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
      
      // If karate status changed, update karate_users collection
      const user = users.find(u => u.uid === uid)
      const karateStatusChanged = user && updated.practicesKarate !== undefined && 
        user.practicesKarate !== updated.practicesKarate
      
      if (karateStatusChanged) {
        if (updated.practicesKarate) {
          // Add to karate_users with guaranteed non-undefined values
          const karateUserData = {
            name: updated.displayName || user.displayName, // Use existing name as fallback
            currentBelt: 'white',
            attendedClasses: 0,
            requiredClasses: 20,
            beltHistory: [{
              belt: 'white',
              date: new Date().toISOString()
            }],
            katas: {
              technique: [],
              assiduite: [],
              comprehension: [],
              esprit: []
            }
          }
          await setDoc(doc(db, 'karate_users', uid), karateUserData)
        } else {
          // Remove from karate_users
          await deleteDoc(doc(db, 'karate_users', uid))
        }
      }
      
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
    
    const userData = {
      displayName: newName.trim(),
      role: newRole,
      color: newColor,
      avatar: newAvatar,
      practicesKarate: newPracticesKarate
    }
    
    const docRef = await addDoc(collection(db, 'users'), userData)
    
    if (newPracticesKarate) {
      await setDoc(doc(db, 'karate_users', docRef.id), {
        name: newName.trim(),
        currentBelt: 'white',
        attendedClasses: 0,
        requiredClasses: 20,
        beltHistory: [{
          belt: 'white',
          date: new Date().toISOString()
        }],
        katas: {
          technique: [],
          assiduite: [],
          comprehension: [],
          esprit: []
        }
      })
    }
    
    setNewName('')
    setNewRole('enfant')
    setNewColor('#cccccc')
    setNewAvatar('🙂')
    setPracticesKarate(false)
    loadUsers()
  }

  const handleResetPassword = async (user, method) => {
    if (user.role !== 'parent') {
      alert('⚠️ Seuls les parents peuvent réinitialiser leur mot de passe')
      return
    }

    if (method === 'email') {
      try {
        setResetStatus({ loading: true, message: '', error: false })
        await sendPasswordResetEmail(auth, user.email)
        setResetStatus({
          loading: false,
          message: '✅ Email de réinitialisation envoyé',
          error: false
        })
      } catch (error) {
        setResetStatus({
          loading: false,
          message: '❌ Erreur lors de l\'envoi de l\'email',
          error: true
        })
      }
    } else if (method === 'direct') {
      setSelectedUser(user)
      setEmail(user.email)
      setShowPasswordModal(true)
    }

    setTimeout(() => {
      setResetStatus({ loading: false, message: '', error: false })
    }, 3000)
  }

  const handleDirectPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setResetStatus({
        loading: false,
        message: '❌ Les mots de passe ne correspondent pas',
        error: true
      })
      return
    }

    try {
      setResetStatus({ loading: true, message: '', error: false })
      
      // First sign in with email/password
      await signInWithEmailAndPassword(auth, email, currentPassword)
      
      // Then update the password
      await updatePassword(auth.currentUser, newPassword)
      
      setResetStatus({
        loading: false,
        message: '✅ Mot de passe modifié avec succès',
        error: false
      })
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      let errorMessage = '❌ Erreur lors du changement de mot de passe'
      if (error.code === 'auth/wrong-password') {
        errorMessage = '❌ Mot de passe actuel incorrect'
      }
      setResetStatus({
        loading: false,
        message: errorMessage,
        error: true
      })
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

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editing[user.uid]?.practicesKarate ?? user.practicesKarate}
                onChange={e => handleChange(user.uid, 'practicesKarate', e.target.checked)}
              />
              🥋 Pratique le karaté
            </label>

            <button onClick={() => handleSave(user.uid)}>✅ Valider</button>

            {user.role === 'parent' && (
              <div className="password-reset-options">
                <button 
                  className="reset-password-button"
                  onClick={() => handleResetPassword(user, 'email')}
                  disabled={resetStatus.loading}
                >
                  📧 Réinitialiser par email
                </button>
                <button 
                  className="reset-password-button"
                  onClick={() => handleResetPassword(user, 'direct')}
                  disabled={resetStatus.loading}
                >
                  🔑 Changer le mot de passe
                </button>
              </div>
            )}

            {resetStatus.message && user.role === 'parent' && (
              <div className={`reset-status ${resetStatus.error ? 'error' : 'success'}`}>
                {resetStatus.message}
              </div>
            )}
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newPracticesKarate}
            onChange={e => setPracticesKarate(e.target.checked)}
          />
          🥋 Pratique le karaté
        </label>
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

      {showPasswordModal && (
        <div className="password-modal">
          <div className="password-modal-content">
            <h3>🔑 Changer le mot de passe</h3>
            <input
              type="password"
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleDirectPasswordChange}>Confirmer</button>
              <button onClick={() => {
                setShowPasswordModal(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}