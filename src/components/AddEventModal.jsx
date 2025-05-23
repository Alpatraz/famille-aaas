import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
} from 'firebase/firestore'
import './AddEventModal.css'

export default function AddEventModal({ onClose, initialData, onSave }) {
  const isEdit = initialData && initialData.id

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    date: initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    duration: initialData?.duration || 60,
    participants: initialData?.participants || [],
    type: initialData?.type || 'autre',
  })

  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const userList = snap.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }))
      setUsers(userList)
    }
    fetchUsers()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      participants: checked
        ? [...prev.participants, value]
        : prev.participants.filter((uid) => uid !== value),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const payload = {
      title: formData.title,
      date: formData.date.split('T')[0],
      duration: Number(formData.duration),
      participants: formData.participants,
      type: formData.type,
    }

    if (isEdit) {
      payload.id = initialData.id
    }

    try {
      await onSave(payload)
      onClose()
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde :', error)
      alert('Erreur lors de la sauvegarde.')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{isEdit ? '✏️ Modifier' : '➕ Ajouter'} un événement</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Titre :
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Date et heure :
              <input
                type="datetime-local"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Durée (minutes) :
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Type :
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="activite">Activité</option>
                <option value="rdv">Rendez-vous</option>
                <option value="repas">Repas</option>
                <option value="sport">Sport</option>
                <option value="autre">Autre</option>
              </select>
            </label>
          </div>

          <div className="form-group">
            <label>Participants :</label>
            <div className="participants-list">
              {users.map((user) => (
                <label key={user.uid} className="participant-checkbox">
                  <input
                    type="checkbox"
                    value={user.uid}
                    checked={formData.participants.includes(user.uid)}
                    onChange={handleCheckboxChange}
                  />
                  {user.avatar || '🙂'} {user.displayName}
                </label>
              ))}
            </div>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="submit-button">
              {isEdit ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={onClose} className="cancel-button">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}