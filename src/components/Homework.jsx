import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Homework.css';

const SUBJECTS = {
  math: { name: 'Mathématiques', icon: '📐' },
  french: { name: 'Français', icon: '📚' },
  english: { name: 'Anglais', icon: '🌍' },
  science: { name: 'Sciences', icon: '🔬' },
  history: { name: 'Histoire', icon: '📜' },
  other: { name: 'Autre', icon: '📌' }
};

export default function Homework() {
  const [homeworks, setHomeworks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  const [newHomework, setNewHomework] = useState({
    title: '',
    subject: '',
    dueDate: '',
    link: '',
    description: '',
    assignedTo: ''
  });

  useEffect(() => {
    loadHomeworks();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'enfant')));
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(data);
  };

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
    if (editingHomework) {
      await updateDoc(doc(db, 'homeworks', editingHomework.id), {
        ...newHomework,
        updatedAt: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, 'homeworks'), {
        ...newHomework,
        createdAt: new Date().toISOString(),
        completed: false
      });
    }
    setNewHomework({
      title: '',
      subject: '',
      dueDate: '',
      link: '',
      description: '',
      assignedTo: ''
    });
    setShowAddForm(false);
    setEditingHomework(null);
    loadHomeworks();
  };

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce devoir ?')) {
      await deleteDoc(doc(db, 'homeworks', id));
      loadHomeworks();
    }
  };

  const handleEdit = (homework) => {
    setEditingHomework(homework);
    setNewHomework({
      title: homework.title,
      subject: homework.subject,
      dueDate: homework.dueDate,
      link: homework.link,
      description: homework.description,
      assignedTo: homework.assignedTo
    });
    setShowAddForm(true);
  };

  const groupedHomeworks = homeworks.reduce((acc, homework) => {
    if (!acc[homework.assignedTo]) {
      acc[homework.assignedTo] = {};
    }
    if (!acc[homework.assignedTo][homework.subject]) {
      acc[homework.assignedTo][homework.subject] = [];
    }
    acc[homework.assignedTo][homework.subject].push(homework);
    return acc;
  }, {});

  return (
    <div className="homework-container">
      <div className="homework-header">
        <h3>📚 Devoirs</h3>
        <button className="add-homework-button" onClick={() => setShowAddForm(true)}>
          ➕ Ajouter
        </button>
      </div>

      <div className="folders-container">
        {users.map(user => (
          <div
            key={user.id}
            className="user-folder"
            onClick={() => setSelectedUser(user)}
          >
            <div className="folder-icon">{user.avatar || '👤'}</div>
            <div className="folder-name">{user.displayName}</div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <Modal
          title={`📚 Devoirs de ${selectedUser.displayName}`}
          onClose={() => {
            setSelectedUser(null);
            setSelectedSubject(null);
          }}
        >
          {!selectedSubject ? (
            <div className="subjects-grid">
              {Object.entries(SUBJECTS).map(([key, subject]) => (
                <div
                  key={key}
                  className="subject-folder"
                  onClick={() => setSelectedSubject(key)}
                >
                  <div className="folder-icon">{subject.icon}</div>
                  <div className="folder-name">{subject.name}</div>
                  <div className="homework-count">
                    {groupedHomeworks[selectedUser.displayName]?.[key]?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="homework-subject-list">
              <div className="subject-header">
                <button
                  className="back-button"
                  onClick={() => setSelectedSubject(null)}
                >
                  ← Retour
                </button>
                <h4>{SUBJECTS[selectedSubject].icon} {SUBJECTS[selectedSubject].name}</h4>
              </div>
              <div className="homework-files">
                {groupedHomeworks[selectedUser.displayName]?.[selectedSubject]?.map(homework => (
                  <div key={homework.id} className="homework-file">
                    <div className="file-content">
                      <h5>{homework.title}</h5>
                      <p>{homework.description}</p>
                      {homework.link && (
                        <a
                          href={homework.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          📎 Voir le document
                        </a>
                      )}
                      <div className="file-date">
                        Pour le {new Date(homework.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(homework)}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(homework.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {(!groupedHomeworks[selectedUser.displayName]?.[selectedSubject] ||
                  groupedHomeworks[selectedUser.displayName][selectedSubject].length === 0) && (
                  <p className="no-homework">Aucun devoir dans cette matière</p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {showAddForm && (
        <Modal
          title={editingHomework ? "✏️ Modifier le devoir" : "➕ Ajouter un devoir"}
          onClose={() => {
            setShowAddForm(false);
            setEditingHomework(null);
            setNewHomework({
              title: '',
              subject: '',
              dueDate: '',
              link: '',
              description: '',
              assignedTo: ''
            });
          }}
        >
          <form onSubmit={handleSubmit} className="homework-form">
            <select
              value={newHomework.assignedTo}
              onChange={e => setNewHomework({...newHomework, assignedTo: e.target.value})}
              required
            >
              <option value="">Sélectionner un enfant</option>
              {users.map(user => (
                <option key={user.id} value={user.displayName}>
                  {user.avatar} {user.displayName}
                </option>
              ))}
            </select>
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
              {Object.entries(SUBJECTS).map(([key, subject]) => (
                <option key={key} value={key}>
                  {subject.icon} {subject.name}
                </option>
              ))}
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
              <button type="submit" className="submit-button">
                {editingHomework ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingHomework(null);
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}