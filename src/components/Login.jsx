import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      if (!email) {
        throw new Error('Veuillez entrer votre email')
      }

      // Temporary: Use a default password for all users
      const tempPassword = 'TemporaryAccess2025!'
      
      const userCredential = await signInWithEmailAndPassword(auth, email, tempPassword)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        onLogin({
          ...userCredential.user,
          role: userData.role || 'enfant',
          color: userData.color || '#94a3b8',
          avatar: userData.avatar || '👤'
        })
      } else {
        onLogin(userCredential.user)
      }
    } catch (err) {
      console.error('Erreur de connexion détaillée:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Temporarily disabled password reset
      setError('La réinitialisation du mot de passe est temporairement désactivée')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <h2>Connexion</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {resetSent && (
        <p className="success-message">
          Un email de réinitialisation a été envoyé
        </p>
      )}
    </div>
  )
}