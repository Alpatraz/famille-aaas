import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import Modal from './Modal';
import './TodoManager.css';

const DEFAULT_FOLDERS = {
  'events': {
    name: 'Événements',
    icon: '🎉'
  },
  'shopping': {
    name: 'Courses',
    icon: '🛒'
  },
  'home': {
    name: 'Maison',
    icon: '🏠'
  },
  'vacation': {
    name: 'Vacances',
    icon: '✈️'
  },
  'projects': {
    name: 'Projets',
    icon: '📋'
  }
};

export default function TodoManager() {
  const [folders, setFolders] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [showListView, setShowListView] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      // Create default folders if they don't exist
      for (const [id, folderData] of Object.entries(DEFAULT_FOLDERS)) {
        const folderRef = doc(db, 'todos', id);
        const folderDoc = await getDoc(folderRef);
        
        if (!folderDoc.exists()) {
          await setDoc(folderRef, folderData);
        }
      }

      // Load all folders
      const snap = await getDocs(collection(db, 'todos'));
      const data = snap.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim() || !selectedFolder) return;

    try {
      const folderRef = doc(db, 'todos', selectedFolder);
      const folderDoc = await getDoc(folderRef);

      if (!folderDoc.exists()) {
        const defaultData = DEFAULT_FOLDERS[selectedFolder] || {
          name: 'New Folder',
          lists: []
        };
        await setDoc(folderRef, defaultData);
      }

      const updatedFolder = {
        ...folders[selectedFolder],
        lists: [
          ...(folders[selectedFolder].lists || []),
          {
            id: Date.now().toString(),
            name: newListName,
            items: []
          }
        ]
      };

      await updateDoc(folderRef, updatedFolder);
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

  const handleFolderClick = (folderId) => {
    setSelectedFolder(folderId);
    setShowListView(true);
  };

  return (
    <div className="todo-manager">
      <div className="todo-header">
        <h2>📝 To-Do</h2>
      </div>

      <div className="folders-grid">
        {Object.entries(folders).map(([id, folder]) => (
          <div
            key={id}
            className="folder-card"
            onClick={() => handleFolderClick(id)}
          >
            <div className="folder-icon">{folder.icon}</div>
            <span className="folder-name">{folder.name}</span>
          </div>
        ))}
      </div>

      {showListView && (
        <Modal
          title={`${folders[selectedFolder]?.icon} ${folders[selectedFolder]?.name}`}
          onClose={() => {
            setShowListView(false);
            setSelectedFolder(null);
            setSelectedList(null);
          }}
        >
          {!selectedList ? (
            <div className="folder-view">
              <div className="folder-header">
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
                {(folders[selectedFolder]?.lists || []).map(list => (
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
                    folders[selectedFolder]?.lists.find(
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
                {folders[selectedFolder]?.lists
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
        </Modal>
      )}
    </div>
  );
}