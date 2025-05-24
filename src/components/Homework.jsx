import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [newHomework, setNewHomework] = useState({
    title: '',
    subject: '',
    link: '',
    description: '',
    assignedTo: ''
  });

  useEffect(() => {
    loadHomeworks();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'enfant')));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadHomeworks = async () => {
    try {
      const snap = await getDocs(collection(db, 'homeworks'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHomeworks(data);
    } catch (error) {
      console.error('Error loading homeworks:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Le fichier est trop volumineux (max 10MB)');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const uploadFile = async (file, assignedTo) => {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `homeworks/${assignedTo}/${fileName}`;
      const fileRef = ref(storage, filePath);
      
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      
      return { fileUrl: downloadUrl, filePath };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Erreur lors du téléchargement du fichier');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setUploadError(null);

    try {
      if (!newHomework.title || !newHomework.subject || !newHomework.assignedTo) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      let fileData = {};
      if (selectedFile) {
        fileData = await uploadFile(selectedFile, newHomework.assignedTo);
      }

      const today = new Date().toISOString().split('T')[0];

      const homeworkData = {
        ...newHomework,
        ...fileData,
        dueDate: today,
        updatedAt: new Date().toISOString()
      };

      if (editingHomework) {
        if (editingHomework.filePath && fileData.fileUrl) {
          const oldFileRef = ref(storage, editingHomework.filePath);
          await deleteObject(oldFileRef).catch(console.error);
        }
        await updateDoc(doc(db, 'homeworks', editingHomework.id), homeworkData);
      } else {
        await addDoc(collection(db, 'homeworks'), {
          ...homeworkData,
          createdAt: new Date().toISOString(),
          completed: false
        });
      }

      setNewHomework({
        title: '',
        subject: '',
        link: '',
        description: '',
        assignedTo: ''
      });
      setSelectedFile(null);
      setShowAddForm(false);
      setEditingHomework(null);
      await loadHomeworks();
    } catch (error) {
      console.error('Error submitting homework:', error);
      setUploadError(error.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (homework) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce devoir ?')) {
      try {
        if (homework.filePath) {
          const fileRef = ref(storage, homework.filePath);
          await deleteObject(fileRef).catch(console.error);
        }
        await deleteDoc(doc(db, 'homeworks', homework.id));
        await loadHomeworks();
      } catch (error) {
        console.error('Error deleting homework:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (homework) => {
    setEditingHomework(homework);
    setNewHomework({
      title: homework.title,
      subject: homework.subject,
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

  const renderHomeworkFile = (homework) => (
    <div key={homework.id} className="homework-file">
      <div className="file-content">
        <h5>{homework.title}</h5>
        <p>{homework.description}</p>
        <div className="file-links">
          {homework.link && (
            <a
              href={homework.link}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
            >
              🔗 Lien externe
            </a>
          )}
          {homework.fileUrl && (
            <a
              href={homework.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link document"
            >
              📎 Télécharger le document
            </a>
          )}
        </div>
        <div className="file-date">
          Ajouté le {new Date(homework.createdAt).toLocaleDateString()}
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
          onClick={() => handleDelete(homework)}
        >
          🗑️
        </button>
      </div>
    </div>
  );

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
                {groupedHomeworks[selectedUser.displayName]?.[selectedSubject]?.map(homework => 
                  renderHomeworkFile(homework)
                )}
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
              link: '',
              description: '',
              assignedTo: ''
            });
            setSelectedFile(null);
            setUploadError(null);
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
            <div className="file-upload">
              <input
                type="file"
                onChange={handleFileChange}
                className="file-input"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <div className="selected-file">
                  📎 {selectedFile.name}
                </div>
              )}
              {uploadError && (
                <div className="upload-error" style={{ color: 'red', marginTop: '0.5rem' }}>
                  ❌ {uploadError}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting || uploadError}
              >
                {isSubmitting ? 'Enregistrement...' : (editingHomework ? 'Modifier' : 'Ajouter')}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingHomework(null);
                  setSelectedFile(null);
                  setUploadError(null);
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