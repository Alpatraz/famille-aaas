import { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      if (!email || !password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password)
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
      console.error('Erreur de connexion:', err)
      
      // Provide specific error messages based on Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Aucun compte trouvé avec cet email')
          break
        case 'auth/wrong-password':
          setError('Mot de passe incorrect')
          break
        case 'auth/invalid-email':
          setError('Format d\'email invalide')
          break
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Veuillez réessayer plus tard')
          break
        default:
          setError('Une erreur est survenue. Veuillez réessayer.')
      }
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
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
      setError(null)
    } catch (err) {
      console.error('Erreur réinitialisation:', err)
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cet email')
      } else {
        setError('Erreur lors de l\'envoi de l\'email de réinitialisation')
      }
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

      <button 
        onClick={handleResetPassword} 
        disabled={loading}
        className="reset-password-button"
      >
        Mot de passe oublié ?
      </button>

      {error && <p className="error-message">{error}</p>}
      {resetSent && (
        <p className="success-message">
          Un email de réinitialisation a été envoyé
        </p>
      )}
    </div>
  )
}