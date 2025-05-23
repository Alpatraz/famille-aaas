import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs } from 'firebase/firestore'
import './AddEventModal.css'

export default function AddEventModal({ onClose, initialData, onSave }) {
  const isEdit = initialData && initialData.id

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    startDate: initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    endDate: initialData?.endDate
      ? new Date(initialData.endDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    participants: initialData?.participants || [],
    type: initialData?.type || 'autre',
  })

  const [users, setUsers] = useState([])

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'))
      const userList = snap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      }))
      setUsers(userList)
    }
    fetchUsers()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'startDate' && new Date(value) > new Date(prev.endDate)) {
        return {
          ...prev,
          [name]: value,
          endDate: value
        }
      }
      return { ...prev, [name]: value }
    })
  }

  const toggleParticipant = (uid) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(uid)
        ? prev.participants.filter(id => id !== uid)
        : [...prev.participants, uid]
    }))
  }

  const calculateDuration = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    return Math.round((end - start) / (1000 * 60))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const payload = {
      title: formData.title,
      date: formData.startDate.split('T')[0],
      startTime: formData.startDate.split('T')[1],
      endDate: formData.endDate,
      duration: calculateDuration(),
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
        <div className="modal-header">
          <h3>{isEdit ? '✏️ Modifier' : '➕ Ajouter'} un événement</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Titre</label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ex: Rendez-vous dentiste"
              />
            </div>

            <div className="datetime-group">
              <div className="form-group">
                <label htmlFor="startDate">Début</label>
                <input
                  id="startDate"
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate">Fin</label>
                <input
                  id="endDate"
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  min={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="type">Type d'événement</label>
              <select
                id="type"
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
            </div>

            <div className="form-group">
              <label>Participants</label>
              <div className="participants-grid">
                {users.map((user) => (
                  <div
                    key={user.uid}
                    className={`participant-card ${formData.participants.includes(user.uid) ? 'selected' : ''}`}
                    onClick={() => toggleParticipant(user.uid)}
                  >
                    <span className="participant-avatar">{user.avatar || '🙂'}</span>
                    <span className="participant-name">{user.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="cancel-button">
            Annuler
          </button>
          <button type="submit" onClick={handleSubmit} className="submit-button">
            {isEdit ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}