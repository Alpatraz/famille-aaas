import './styles/App.css'
import './styles/dashboard.css'
import './styles/profile.css'

import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, Link } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

import Login from './components/Login'
import Signup from './components/Signup'
import Dashboard from './pages/Dashboard'
import ProfileSettings from './pages/ProfileSettings'
import Historique from './pages/Historique'
import TaskList from './pages/TaskList'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('login')
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          const data = userDoc.exists() ? userDoc.data() : {}
          setUser({ 
            ...currentUser, 
            role: data.role || 'enfant',
            color: data.color || '#94a3b8',
            avatar: data.avatar || '👤'
          })
        } catch {
          setUser({ 
            ...currentUser, 
            role: 'enfant',
            color: '#94a3b8',
            avatar: '👤'
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
    navigate('/')
  }

  if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Chargement...</p>

  if (!user) {
    return (
      <div className="dashboard-section" style={{ maxWidth: 400, margin: '2rem auto' }}>
        {mode === 'signup' ? (
          <>
            <Signup onSignup={setUser} />
            <p style={{ textAlign: 'center' }}>
              Déjà inscrit ? <button onClick={() => setMode('login')}>Se connecter</button>
            </p>
          </>
        ) : (
          <>
            <Login onLogin={setUser} />
            <p style={{ textAlign: 'center' }}>
              Pas encore de compte ? <button onClick={() => setMode('signup')}>Créer un compte</button>
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="welcome-banner">
        <div className="welcome-content">
          <h1>TABLEAU DE BORD FAMILIAL</h1>
          <div className="user-info">
            <span className="user-name">{user.displayName || user.email}</span>
            <span className="role-tag" style={{ backgroundColor: user.color }}>
              {user.avatar} {user.role}
            </span>
          </div>
        </div>
        <div className="nav-actions">
          <div className="nav-buttons">
            <Link to="/" className="nav-button">🏠 Accueil</Link>
            {user.role === 'parent' && (
              <>
                <Link to="/profil" className="nav-button">⚙️ Profils</Link>
                <Link to="/historique" className="nav-button">📊 Historique</Link>
                <Link to="/taches" className="nav-button">📋 Tâches</Link>
              </>
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard user={user} />} />
        {user.role === 'parent' && <Route path="/profil" element={<ProfileSettings />} />}
        {user.role === 'parent' && <Route path="/historique" element={<Historique />} />}
        {user.role === 'parent' && <Route path="/taches" element={<TaskList />} />}
      </Routes>
    </div>
  )
}