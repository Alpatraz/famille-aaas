import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore'
import '../styles/tasks.css'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [consequences, setConsequences] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')

  const [newTask, setNewTask] = useState('')
  const [newTaskValue, setNewTaskValue] = useState(5)
  const [newReward, setNewReward] = useState('')
  const [newRewardCost, setNewRewardCost] = useState(20)
  const [newConsequence, setNewConsequence] = useState('')
  const [newConsequenceCost, setNewConsequenceCost] = useState(10)

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

  const handleAdd = async (type) => {
    let collection_name, data
    
    switch (type) {
      case 'task':
        if (!newTask.trim()) return
        collection_name = 'tasks'
        data = { label: newTask.trim(), value: Number(newTaskValue) }
        setNewTask('')
        setNewTaskValue(5)
        break
      case 'reward':
        if (!newReward.trim()) return
        collection_name = 'rewards'
        data = { label: newReward.trim(), cost: Number(newRewardCost) }
        setNewReward('')
        setNewRewardCost(20)
        break
      case 'consequence':
        if (!newConsequence.trim()) return
        collection_name = 'consequences'
        data = { label: newConsequence.trim(), cost: Number(newConsequenceCost) }
        setNewConsequence('')
        setNewConsequenceCost(10)
        break
    }

    await addDoc(collection(db, collection_name), data)
    loadData()
  }

  const handleDelete = async (type, id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return
    await deleteDoc(doc(db, type, id))
    loadData()
  }

  const handleEdit = async (type, id, data) => {
    await updateDoc(doc(db, type, id), data)
    loadData()
  }

  return (
    <div className="tasks-manager">
      <div className="tasks-tabs">
        <button 
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ Tâches
        </button>
        <button 
          className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          🎁 Récompenses
        </button>
        <button 
          className={`tab ${activeTab === 'consequences' ? 'active' : ''}`}
          onClick={() => setActiveTab('consequences')}
        >
          ⚠️ Conséquences
        </button>
      </div>

      <div className="tasks-content">
        {activeTab === 'tasks' && (
          <div className="section">
            <h2>✅ Gestion des tâches</h2>
            <div className="add-form">
              <input
                type="text"
                placeholder="Nouvelle tâche"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
              />
              <input
                type="number"
                value={newTaskValue}
                onChange={e => setNewTaskValue(e.target.value)}
                min="0"
              />
              <button onClick={() => handleAdd('task')}>Ajouter</button>
            </div>
            <ul className="items-list">
              {tasks.map(task => (
                <li key={task.id} className="item">
                  <span className="item-label">{task.label}</span>
                  <div className="item-actions">
                    <span className="points">+{task.value} pts</span>
                    <button onClick={() => handleDelete('tasks', task.id)} className="delete">
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="section">
            <h2>🎁 Gestion des récompenses</h2>
            <div className="add-form">
              <input
                type="text"
                placeholder="Nouvelle récompense"
                value={newReward}
                onChange={e => setNewReward(e.target.value)}
              />
              <input
                type="number"
                value={newRewardCost}
                onChange={e => setNewRewardCost(e.target.value)}
                min="0"
              />
              <button onClick={() => handleAdd('reward')}>Ajouter</button>
            </div>
            <ul className="items-list">
              {rewards.map(reward => (
                <li key={reward.id} className="item">
                  <span className="item-label">{reward.label}</span>
                  <div className="item-actions">
                    <span className="points cost">{reward.cost} pts</span>
                    <button onClick={() => handleDelete('rewards', reward.id)} className="delete">
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'consequences' && (
          <div className="section">
            <h2>⚠️ Gestion des conséquences</h2>
            <div className="add-form">
              <input
                type="text"
                placeholder="Nouvelle conséquence"
                value={newConsequence}
                onChange={e => setNewConsequence(e.target.value)}
              />
              <input
                type="number"
                value={newConsequenceCost}
                onChange={e => setNewConsequenceCost(e.target.value)}
                min="0"
              />
              <button onClick={() => handleAdd('consequence')}>Ajouter</button>
            </div>
            <ul className="items-list">
              {consequences.map(consequence => (
                <li key={consequence.id} className="item">
                  <span className="item-label">{consequence.label}</span>
                  <div className="item-actions">
                    <span className="points negative">-{consequence.cost} pts</span>
                    <button onClick={() => handleDelete('consequences', consequence.id)} className="delete">
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}