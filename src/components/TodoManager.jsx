import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import Modal from './Modal';
import './TodoManager.css';

const SECTIONS = {
  'tasks': { name: 'Tâches', icon: '✅' },
  'rewards': { name: 'Récompenses', icon: '🎁' },
  'consequences': { name: 'Conséquences', icon: '⚠️' }
};

export default function TodoManager() {
  const [sections, setSections] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [showListView, setShowListView] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      // Create default sections if they don't exist
      for (const [id, sectionData] of Object.entries(SECTIONS)) {
        const sectionRef = doc(db, 'todos', id);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
          await setDoc(sectionRef, {
            ...sectionData,
            lists: []
          });
        }
      }

      // Load all sections
      const snap = await getDocs(collection(db, 'todos'));
      const data = snap.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      setSections(data);
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim() || !selectedSection) return;

    try {
      const sectionRef = doc(db, 'todos', selectedSection);
      const updatedSection = {
        ...sections[selectedSection],
        lists: [
          ...(sections[selectedSection].lists || []),
          {
            id: Date.now().toString(),
            name: newListName,
            items: []
          }
        ]
      };

      await updateDoc(sectionRef, updatedSection);
      setSections(prev => ({
        ...prev,
        [selectedSection]: updatedSection
      }));

      setNewListName('');
      setShowNewList(false);
    } catch (error) {
      console.error('Error adding list:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !selectedSection || !selectedList) return;

    try {
      const updatedSection = {
        ...sections[selectedSection],
        lists: sections[selectedSection].lists.map(list =>
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

      await updateDoc(doc(db, 'todos', selectedSection), updatedSection);
      setSections(prev => ({
        ...prev,
        [selectedSection]: updatedSection
      }));

      setNewItemText('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleToggleItem = async (itemId) => {
    if (!selectedSection || !selectedList) return;

    try {
      const updatedSection = {
        ...sections[selectedSection],
        lists: sections[selectedSection].lists.map(list =>
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

      await updateDoc(doc(db, 'todos', selectedSection), updatedSection);
      setSections(prev => ({
        ...prev,
        [selectedSection]: updatedSection
      }));
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!selectedSection || !selectedList) return;

    try {
      const updatedSection = {
        ...sections[selectedSection],
        lists: sections[selectedSection].lists.map(list =>
          list.id === selectedList
            ? {
                ...list,
                items: list.items.filter(item => item.id !== itemId)
              }
            : list
        )
      };

      await updateDoc(doc(db, 'todos', selectedSection), updatedSection);
      setSections(prev => ({
        ...prev,
        [selectedSection]: updatedSection
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="todo-manager">
      <div className="todo-header">
        <div className="header-content">
          <h2>📝 To-Do</h2>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="sections-grid">
        {Object.entries(SECTIONS).map(([id, section]) => (
          <div
            key={id}
            className="section-folder"
            onClick={() => {
              setSelectedSection(id);
              setShowListView(true);
            }}
          >
            <div className="folder-icon">{section.icon}</div>
            <span className="folder-name">{section.name}</span>
          </div>
        ))}
      </div>

      {showListView && (
        <Modal
          title={`${SECTIONS[selectedSection]?.icon} ${SECTIONS[selectedSection]?.name}`}
          onClose={() => {
            setShowListView(false);
            setSelectedSection(null);
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
                {(sections[selectedSection]?.lists || []).map(list => (
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
                    sections[selectedSection]?.lists.find(
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
                {sections[selectedSection]?.lists
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