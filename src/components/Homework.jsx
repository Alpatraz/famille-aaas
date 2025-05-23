import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import './Homework.css';

export default function Homework() {
  const [homeworks, setHomeworks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHomework, setNewHomework] = useState({
    title: '',
    subject: '',
    dueDate: '',
    link: '',
    description: ''
  });

  useEffect(() => {
    loadHomeworks();
  }, []);

  const loadHomeworks = async () => {
    const snap = await getDocs(collection(db, 'homeworks'));
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setHomeworks(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'homeworks'), {
      ...newHomework,
      createdAt: new Date().toISOString(),
      completed: false
    });
    setNewHomework({
      title: '',
      subject: '',
      dueDate: '',
      link: '',
      description: ''
    });
    setShowAddForm(false);
    loadHomeworks();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'homeworks', id));
    loadHomeworks();
  };

  const toggleComplete = async (homework) => {
    await updateDoc(doc(db, 'homeworks', homework.id), {
      completed: !homework.completed
    });
    loadHomeworks();
  };

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h3>📚 Devoirs</h3>
        <button className="add-homework-button" onClick={() => setShowAddForm(true)}>
          ➕ Ajouter
        </button>
      </div>

      {showAddForm && (
        <div className="homework-form">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Titre du devoir"
              value={newHomework.title}
              onChange={e => setNewHomework({...newHomework, title: e.target.value})}
              required
            />
            <select
              value={newHomework.subject}
              onChange={e => setNewHomework({...newHomework, subject: e.target.value})}
              required
            >
              <option value="">Sélectionner une matière</option>
              <option value="math">Mathématiques</option>
              <option value="french">Français</option>
              <option value="english">Anglais</option>
              <option value="science">Sciences</option>
              <option value="history">Histoire</option>
              <option value="other">Autre</option>
            </select>
            <input
              type="date"
              value={newHomework.dueDate}
              onChange={e => setNewHomework({...newHomework, dueDate: e.target.value})}
              required
            />
            <input
              type="url"
              placeholder="Lien (optionnel)"
              value={newHomework.link}
              onChange={e => setNewHomework({...newHomework, link: e.target.value})}
            />
            <textarea
              placeholder="Description"
              value={newHomework.description}
              onChange={e => setNewHomework({...newHomework, description: e.target.value})}
              rows="3"
            />
            <div className="form-actions">
              <button type="submit" className="submit-button">Ajouter</button>
              <button type="button" className="cancel-button" onClick={() => setShowAddForm(false)}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="homework-list">
        {homeworks.length === 0 ? (
          <p className="no-homework">Aucun devoir pour le moment</p>
        ) : (
          homeworks.map(homework => (
            <div key={homework.id} className={`homework-item ${homework.completed ? 'completed' : ''}`}>
              <div className="homework-content">
                <div className="homework-header">
                  <h4>{homework.title}</h4>
                  <span className={`subject-tag ${homework.subject}`}>
                    {homework.subject}
                  </span>
                </div>
                <p className="homework-description">{homework.description}</p>
                {homework.link && (
                  <a href={homework.link} target="_blank" rel="noopener noreferrer" className="homework-link">
                    📎 Voir le document
                  </a>
                )}
                <div className="homework-footer">
                  <span className="due-date">📅 Pour le {new Date(homework.dueDate).toLocaleDateString()}</span>
                  <div className="homework-actions">
                    <button 
                      className={`complete-button ${homework.completed ? 'completed' : ''}`}
                      onClick={() => toggleComplete(homework)}
                    >
                      {homework.completed ? '✓ Fait' : 'À faire'}
                    </button>
                    <button className="delete-button" onClick={() => handleDelete(homework.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}