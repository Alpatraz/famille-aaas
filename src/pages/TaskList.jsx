import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore'
import '../styles/taskPage.css'

export default function TaskList() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [consequences, setConsequences] = useState([])

  const [newItem, setNewItem] = useState('')
  const [newValue, setNewValue] = useState(5)
  const [editingId, setEditingId] = useState(null)
  const [editingItem, setEditingItem] = useState({ label: '', value: 0 })

  const loadData = async () => {
    const taskSnap = await getDocs(collection(db, 'tasks'))
    setTasks(taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

    const rewardSnap = await getDocs(collection(db, 'rewards'))
    setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

    const consequenceSnap = await getDocs(collection(db, 'consequences'))
    setConsequences(consequenceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdd = async () => {
    if (!newItem.trim()) return
    const collection_name = activeTab === 'tasks' ? 'tasks' : 
                          activeTab === 'rewards' ? 'rewards' : 'consequences'
    
    await addDoc(collection(db, collection_name), { 
      label: newItem.trim(), 
      [activeTab === 'tasks' ? 'value' : 'cost']: Number(newValue)
    })
    setNewItem('')
    setNewValue(5)
    loadData()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      const collection_name = activeTab === 'tasks' ? 'tasks' : 
                            activeTab === 'rewards' ? 'rewards' : 'consequences'
      await deleteDoc(doc(db, collection_name, id))
      loadData()
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditingItem({ 
      label: item.label, 
      value: item.value || item.cost || 0 
    })
  }

  const confirmEdit = async () => {
    if (!editingItem.label.trim()) return
    const collection_name = activeTab === 'tasks' ? 'tasks' : 
                          activeTab === 'rewards' ? 'rewards' : 'consequences'
    
    await updateDoc(doc(db, collection_name, editingId), {
      label: editingItem.label.trim(),
      [activeTab === 'tasks' ? 'value' : 'cost']: Number(editingItem.value)
    })
    setEditingId(null)
    setEditingItem({ label: '', value: 0 })
    loadData()
  }

  const getItems = () => {
    switch (activeTab) {
      case 'tasks': return tasks
      case 'rewards': return rewards
      case 'consequences': return consequences
      default: return []
    }
  }

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
          ⚠️ Conséquences
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
                  <button onClick={confirmEdit} className="confirm-button">
                    Valider
                  </button>
                </div>
              ) : (
                <>
                  <div className="item-content">
                    <span className="item-label">{item.label}</span>
                    <span className={`points-badge ${activeTab !== 'tasks' ? 'cost' : ''} ${activeTab === 'consequences' ? 'negative' : ''}`}>
                      {activeTab === 'tasks' ? '+' : ''}{item.value || item.cost} pts
                    </span>
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
  )
}