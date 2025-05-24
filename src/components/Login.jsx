import { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      onLogin(userCredential.user)
    } catch (err) {
      setError('Email ou mot de passe incorrect')
    }
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez entrer votre email')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Vérifie si l'utilisateur est un parent
      const usersRef = doc(db, 'users', auth.currentUser?.uid || 'temp')
      const userDoc = await getDoc(usersRef)
      
      if (userDoc.exists() && userDoc.data().role === 'parent') {
        await sendPasswordResetEmail(auth, email)
        setResetSent(true)
      } else {
        setError('Seuls les parents peuvent réinitialiser leur mot de passe')
      }
    } catch (err) {
      setError('Erreur lors de l\'envoi de l\'email de réinitialisation')
    }
    
    setLoading(false)
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
        <div className="form-group">
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <div className="reset-password">
        <button 
          onClick={handleResetPassword}
          disabled={loading || !email}
          className="reset-button"
        >
          Mot de passe oublié ?
        </button>
        {resetSent && (
          <p className="success-message">
            Un email de réinitialisation a été envoyé
          </p>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  )
}