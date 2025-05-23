import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore'
import '../styles/taskPage.css'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newTaskValue, setNewTaskValue] = useState(5)
  const [newReward, setNewReward] = useState('')
  const [newRewardCost, setNewRewardCost] = useState(20)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTask, setEditingTask] = useState({ label: '', value: 0 })
  const [editingRewardId, setEditingRewardId] = useState(null)
  const [editingReward, setEditingReward] = useState({ label: '', cost: 0 })

  const loadData = async () => {
    const taskSnap = await getDocs(collection(db, 'tasks'))
    setTasks(taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))

    const rewardSnap = await getDocs(collection(db, 'rewards'))
    setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddTask = async () => {
    if (!newTask.trim()) return
    await addDoc(collection(db, 'tasks'), { label: newTask.trim(), value: Number(newTaskValue) })
    setNewTask('')
    setNewTaskValue(5)
    loadData()
  }

  const handleAddReward = async () => {
    if (!newReward.trim()) return
    await addDoc(collection(db, 'rewards'), { label: newReward.trim(), cost: Number(newRewardCost) })
    setNewReward('')
    setNewRewardCost(20)
    loadData()
  }

  const handleDeleteTask = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      await deleteDoc(doc(db, 'tasks', id))
      loadData()
    }
  }

  const handleDeleteReward = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette récompense ?')) {
      await deleteDoc(doc(db, 'rewards', id))
      loadData()
    }
  }

  const startEditTask = (task) => {
    setEditingTaskId(task.id)
    setEditingTask({ label: task.label, value: task.value })
  }

  const confirmEditTask = async () => {
    if (!editingTask.label.trim()) return
    await updateDoc(doc(db, 'tasks', editingTaskId), {
      label: editingTask.label.trim(),
      value: Number(editingTask.value)
    })
    setEditingTaskId(null)
    setEditingTask({ label: '', value: 0 })
    loadData()
  }

  const startEditReward = (reward) => {
    setEditingRewardId(reward.id)
    setEditingReward({ label: reward.label, cost: reward.cost })
  }

  const confirmEditReward = async () => {
    if (!editingReward.label.trim()) return
    await updateDoc(doc(db, 'rewards', editingRewardId), {
      label: editingReward.label.trim(),
      cost: Number(editingReward.cost)
    })
    setEditingRewardId(null)
    setEditingReward({ label: '', cost: 0 })
    loadData()
  }

  return (
    <div className="task-manager">
      <div className="task-section">
        <div className="section-header">
          <h2>✅ Tâches disponibles</h2>
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
              placeholder="Points"
            />
            <button onClick={handleAddTask} className="add-button">
              Ajouter
            </button>
          </div>
        </div>

        <div className="items-grid">
          {tasks.map(task => (
            <div key={task.id} className="item-card">
              {editingTaskId === task.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editingTask.label}
                    onChange={e => setEditingTask({ ...editingTask, label: e.target.value })}
                    placeholder="Nom de la tâche"
                  />
                  <input
                    type="number"
                    value={editingTask.value}
                    onChange={e => setEditingTask({ ...editingTask, value: e.target.value })}
                    min="0"
                  />
                  <button onClick={confirmEditTask} className="confirm-button">
                    Valider
                  </button>
                </div>
              ) : (
                <>
                  <div className="item-content">
                    <span className="item-label">{task.label}</span>
                    <span className="points-badge">+{task.value} pts</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => startEditTask(task)} className="action-button edit">
                      ✏️ Modifier
                    </button>
                    <button onClick={() => handleDeleteTask(task.id)} className="action-button delete">
                      🗑️ Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="reward-section">
        <div className="section-header">
          <h2>🎁 Récompenses disponibles</h2>
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
              placeholder="Coût"
            />
            <button onClick={handleAddReward} className="add-button">
              Ajouter
            </button>
          </div>
        </div>

        <div className="items-grid">
          {rewards.map(reward => (
            <div key={reward.id} className="item-card">
              {editingRewardId === reward.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editingReward.label}
                    onChange={e => setEditingReward({ ...editingReward, label: e.target.value })}
                    placeholder="Nom de la récompense"
                  />
                  <input
                    type="number"
                    value={editingReward.cost}
                    onChange={e => setEditingReward({ ...editingReward, cost: e.target.value })}
                    min="0"
                  />
                  <button onClick={confirmEditReward} className="confirm-button">
                    Valider
                  </button>
                </div>
              ) : (
                <>
                  <div className="item-content">
                    <span className="item-label">{reward.label}</span>
                    <span className="points-badge cost">{reward.cost} pts</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => startEditReward(reward)} className="action-button edit">
                      ✏️ Modifier
                    </button>
                    <button onClick={() => handleDeleteReward(reward.id)} className="action-button delete">
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