import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import './TodoManager.css';

const DEFAULT_FOLDERS = {
  'shopping': {
    name: '🛒 Liste de courses',
    description: 'Courses, favoris, types et magasins',
    lists: []
  },
  'home': {
    name: '🏠 Maison',
    description: 'Tâches à faire à la maison',
    lists: []
  },
  'vacation': {
    name: '✈️ Vacances',
    description: 'Idées de voyages et activités',
    lists: []
  },
  'projects': {
    name: '📋 Projets',
    description: 'Projets personnels et familiaux',
    lists: []
  },
  'events': {
    name: '🎉 Événements',
    description: 'Planification d\'événements',
    lists: []
  }
};

export default function TodoManager() {
  const [folders, setFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewList, setShowNewList] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const snap = await getDocs(collection(db, 'todos'));
      const data = snap.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      // Merge with default folders
      const mergedFolders = { ...DEFAULT_FOLDERS, ...data };
      setFolders(mergedFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderData = {
        name: newFolderName,
        description: '',
        lists: []
      };

      const docRef = await addDoc(collection(db, 'todos'), folderData);
      setFolders(prev => ({
        ...prev,
        [docRef.id]: { id: docRef.id, ...folderData }
      }));

      setNewFolderName('');
      setShowNewFolder(false);
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim() || !selectedFolder) return;

    try {
      const updatedFolder = {
        ...folders[selectedFolder],
        lists: [
          ...folders[selectedFolder].lists,
          {
            id: Date.now().toString(),
            name: newListName,
            items: []
          }
        ]
      };

      await updateDoc(doc(db, 'todos', selectedFolder), updatedFolder);
      setFolders(prev => ({
        ...prev,
        [selectedFolder]: updatedFolder
      }));

      setNewListName('');
      setShowNewList(false);
    } catch (error) {
      console.error('Error adding list:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !selectedFolder || !selectedList) return;

    try {
      const updatedFolder = {
        ...folders[selectedFolder],
        lists: folders[selectedFolder].lists.map(list =>
          list.id === selectedList
            ? {
                ...list,
                items: [
                  ...list.items,
                  {
                    id: Date.now().toString(),
                    text: newItemText,
                    completed: false,
                    createdAt: new Date().toISOString()
                  }
                ]
              }
            : list
        )
      };

      await updateDoc(doc(db, 'todos', selectedFolder), updatedFolder);
      setFolders(prev => ({
        ...prev,
        [selectedFolder]: updatedFolder
      }));

      setNewItemText('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleToggleItem = async (itemId) => {
    if (!selectedFolder || !selectedList) return;

    try {
      const updatedFolder = {
        ...folders[selectedFolder],
        lists: folders[selectedFolder].lists.map(list =>
          list.id === selectedList
            ? {
                ...list,
                items: list.items.map(item =>
                  item.id === itemId
                    ? { ...item, completed: !item.completed }
                    : item
                )
              }
            : list
        )
      };

      await updateDoc(doc(db, 'todos', selectedFolder), updatedFolder);
      setFolders(prev => ({
        ...prev,
        [selectedFolder]: updatedFolder
      }));
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!selectedFolder || !selectedList) return;

    try {
      const updatedFolder = {
        ...folders[selectedFolder],
        lists: folders[selectedFolder].lists.map(list =>
          list.id === selectedList
            ? {
                ...list,
                items: list.items.filter(item => item.id !== itemId)
              }
            : list
        )
      };

      await updateDoc(doc(db, 'todos', selectedFolder), updatedFolder);
      setFolders(prev => ({
        ...prev,
        [selectedFolder]: updatedFolder
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="todo-manager">
      <div className="todo-header">
        <h2>📝 To-Do</h2>
        <button onClick={() => setShowNewFolder(true)} className="add-button">
          ➕ Nouveau dossier
        </button>
      </div>

      {showNewFolder && (
        <div className="new-folder-form">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nom du dossier"
          />
          <div className="form-actions">
            <button onClick={handleAddFolder} className="confirm-button">
              Ajouter
            </button>
            <button
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
              className="cancel-button"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!selectedFolder ? (
        <div className="folders-grid">
          {Object.entries(folders).map(([id, folder]) => (
            <div
              key={id}
              className="folder-card"
              onClick={() => setSelectedFolder(id)}
            >
              <h3>{folder.name}</h3>
              <p>{folder.description}</p>
              <div className="folder-stats">
                {folder.lists.length} liste{folder.lists.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      ) : !selectedList ? (
        <div className="folder-view">
          <div className="folder-header">
            <button onClick={() => setSelectedFolder(null)} className="back-button">
              ← Retour
            </button>
            <h3>{folders[selectedFolder].name}</h3>
            <button onClick={() => setShowNewList(true)} className="add-button">
              ➕ Nouvelle liste
            </button>
          </div>

          {showNewList && (
            <div className="new-list-form">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nom de la liste"
              />
              <div className="form-actions">
                <button onClick={handleAddList} className="confirm-button">
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    setShowNewList(false);
                    setNewListName('');
                  }}
                  className="cancel-button"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="lists-grid">
            {folders[selectedFolder].lists.map(list => (
              <div
                key={list.id}
                className="list-card"
                onClick={() => setSelectedList(list.id)}
              >
                <h4>{list.name}</h4>
                <div className="list-stats">
                  {list.items?.length || 0} élément{list.items?.length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="list-view">
          <div className="list-header">
            <button onClick={() => setSelectedList(null)} className="back-button">
              ← Retour
            </button>
            <h3>
              {
                folders[selectedFolder].lists.find(
                  list => list.id === selectedList
                )?.name
              }
            </h3>
          </div>

          <div className="add-item-form">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Nouvel élément"
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <button onClick={handleAddItem} className="add-button">
              Ajouter
            </button>
          </div>

          <div className="items-list">
            {folders[selectedFolder].lists
              .find(list => list.id === selectedList)
              ?.items.map(item => (
                <div key={item.id} className={`item ${item.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleItem(item.id)}
                  />
                  <span className="item-text">{item.text}</span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="delete-button"
                  >
                    🗑️
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}