import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where
} from 'firebase/firestore';
import '../styles/taskPage.css';

export default function TaskList() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [consequences, setConsequences] = useState([]);
  const [users, setUsers] = useState([]);

  const [newItem, setNewItem] = useState('');
  const [newValue, setNewValue] = useState(5);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingItem, setEditingItem] = useState({ label: '', value: 0, assignedTo: [] });

  const loadData = async () => {
    const taskSnap = await getDocs(collection(db, 'tasks'));
    setTasks(taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const rewardSnap = await getDocs(collection(db, 'rewards'));
    setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const consequenceSnap = await getDocs(collection(db, 'consequences'));
    setConsequences(consequenceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'enfant')));
    setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!newItem.trim() || selectedUsers.length === 0) return;
    
    const collection_name = activeTab === 'tasks' ? 'tasks' : 
                          activeTab === 'rewards' ? 'rewards' : 'consequences';
    
    await addDoc(collection(db, collection_name), { 
      label: newItem.trim(), 
      [activeTab === 'tasks' ? 'value' : 'cost']: Number(newValue),
      assignedTo: selectedUsers
    });
    
    setNewItem('');
    setNewValue(5);
    setSelectedUsers([]);
    loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      const collection_name = activeTab === 'tasks' ? 'tasks' : 
                            activeTab === 'rewards' ? 'rewards' : 'consequences';
      await deleteDoc(doc(db, collection_name, id));
      loadData();
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingItem({ 
      label: item.label, 
      value: item.value || item.cost || 0,
      assignedTo: item.assignedTo || []
    });
  };

  const confirmEdit = async () => {
    if (!editingItem.label.trim() || editingItem.assignedTo.length === 0) return;
    
    const collection_name = activeTab === 'tasks' ? 'tasks' : 
                          activeTab === 'rewards' ? 'rewards' : 'consequences';
    
    await updateDoc(doc(db, collection_name, editingId), {
      label: editingItem.label.trim(),
      [activeTab === 'tasks' ? 'value' : 'cost']: Number(editingItem.value),
      assignedTo: editingItem.assignedTo
    });
    
    setEditingId(null);
    setEditingItem({ label: '', value: 0, assignedTo: [] });
    loadData();
  };

  const getItems = () => {
    switch (activeTab) {
      case 'tasks': return tasks;
      case 'rewards': return rewards;
      case 'consequences': return consequences;
      default: return [];
    }
  };

  const toggleUser = (userId, isEditing = false) => {
    if (isEditing) {
      setEditingItem(prev => ({
        ...prev,
        assignedTo: prev.assignedTo.includes(userId)
          ? prev.assignedTo.filter(id => id !== userId)
          : [...prev.assignedTo, userId]
      }));
    } else {
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  return (
    <div className="task-manager">
      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ Tâches
        </button>
        <button 
          className={`tab-button ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          🎁 Récompenses
        </button>
        <button 
          className={`tab-button ${activeTab === 'consequences' ? 'active' : ''}`}
          onClick={() => setActiveTab('consequences')}
        >
          ⚠️ Conséq.
        </button>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h2>
            {activeTab === 'tasks' ? '✅ Tâches disponibles' :
             activeTab === 'rewards' ? '🎁 Récompenses disponibles' :
             '⚠️ Conséquences disponibles'}
          </h2>
          <div className="add-form">
            <input
              type="text"
              placeholder={`Nouveau/nouvelle ${
                activeTab === 'tasks' ? 'tâche' :
                activeTab === 'rewards' ? 'récompense' : 'conséquence'
              }`}
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <input
              type="number"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              min="0"
              placeholder={activeTab === 'tasks' ? 'Points' : 'Coût'}
            />
            <div className="user-selector">
              {users.map(user => (
                <div
                  key={user.id}
                  className={`user-tag ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                  onClick={() => toggleUser(user.id)}
                >
                  {user.avatar} {user.displayName}
                </div>
              ))}
            </div>
            <button onClick={handleAdd} className="add-button">
              Ajouter
            </button>
          </div>
        </div>

        <div className="items-grid">
          {getItems().map(item => (
            <div key={item.id} className="item-card">
              {editingId === item.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editingItem.label}
                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                    placeholder="Nom"
                  />
                  <input
                    type="number"
                    value={editingItem.value}
                    onChange={e => setEditingItem({ ...editingItem, value: e.target.value })}
                    min="0"
                  />
                  <div className="user-selector">
                    {users.map(user => (
                      <div
                        key={user.id}
                        className={`user-tag ${editingItem.assignedTo.includes(user.id) ? 'selected' : ''}`}
                        onClick={() => toggleUser(user.id, true)}
                      >
                        {user.avatar} {user.displayName}
                      </div>
                    ))}
                  </div>
                  <button onClick={confirmEdit} className="confirm-button">
                    Valider
                  </button>
                </div>
              ) : (
                <>
                  <div className="item-content">
                    <span className="item-label">{item.label}</span>
                    <span className={`points-badge ${activeTab !== 'tasks' ? 'cost' : ''} ${activeTab === 'consequences' ? 'negative' : ''}`}>
                      {item.value || item.cost} pts
                    </span>
                  </div>
                  <div className="assigned-users">
                    {(item.assignedTo || []).map(userId => {
                      const user = users.find(u => u.id === userId);
                      return user ? (
                        <span key={userId} className="assigned-user">
                          {user.avatar} {user.displayName}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => startEdit(item)} className="action-button edit">
                      ✏️ Modifier
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="action-button delete">
                      🗑️ Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}