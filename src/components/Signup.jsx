import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'

export default function Signup({ onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [prenom, setPrenom] = useState('')
  const [error, setError] = useState(null)

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Met à jour le displayName pour affichage
      await updateProfile(user, { displayName: prenom })

      // 🔐 Enregistre les infos utilisateur dans Firestore
      await setDoc(doc(db, 'users', user.uid), {
        role: 'enfant',
        displayName: prenom,
        email: email
      })

      console.log('✅ Document utilisateur écrit dans Firestore')
      onSignup(user)
    } catch (err) {
      console.error('❌ Erreur inscription :', err)
      setError(err.message)
    }
  }

  return (
    <div className="dashboard-section">
      <h2>Créer un compte</h2>
      <form onSubmit={handleSignup}>
        <label>
          Prénom
          <input
            type="text"
            placeholder="Prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Créer mon compte</button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  )
}
