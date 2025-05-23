import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc
} from 'firebase/firestore'

export default function TaskList() {
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [consequences, setConsequences] = useState([])

  const [newTask, setNewTask] = useState('')
  const [newTaskValue, setNewTaskValue] = useState(5)

  const [newReward, setNewReward] = useState('')
  const [newRewardCost, setNewRewardCost] = useState(20)

  const [newConsequence, setNewConsequence] = useState('')
  const [newConsequenceCost, setNewConsequenceCost] = useState(10)

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTask, setEditingTask] = useState({ label: '', value: 0 })

  const [editingRewardId, setEditingRewardId] = useState(null)
  const [editingReward, setEditingReward] = useState({ label: '', cost: 0 })

  const [editingConsequenceId, setEditingConsequenceId] = useState(null)
  const [editingConsequence, setEditingConsequence] = useState({ label: '', cost: 0 })

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

  const handleAddConsequence = async () => {
    if (!newConsequence.trim()) return
    await addDoc(collection(db, 'consequences'), { label: newConsequence.trim(), cost: Number(newConsequenceCost) })
    setNewConsequence('')
    setNewConsequenceCost(10)
    loadData()
  }

  const handleDeleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id))
    loadData()
  }

  const handleDeleteReward = async (id) => {
    await deleteDoc(doc(db, 'rewards', id))
    loadData()
  }

  const handleDeleteConsequence = async (id) => {
    await deleteDoc(doc(db, 'consequences', id))
    loadData()
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

  const startEditConsequence = (consequence) => {
    setEditingConsequenceId(consequence.id)
    setEditingConsequence({ label: consequence.label, cost: consequence.cost })
  }

  const confirmEditConsequence = async () => {
    if (!editingConsequence.label.trim()) return
    await updateDoc(doc(db, 'consequences', editingConsequenceId), {
      label: editingConsequence.label.trim(),
      cost: Number(editingConsequence.cost)
    })
    setEditingConsequenceId(null)
    setEditingConsequence({ label: '', cost: 0 })
    loadData()
  }

  return (
    <div className="dashboard-section">
      <h2>📋 Tâches disponibles</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {editingTaskId === task.id ? (
              <>
                <input
                  type="text"
                  value={editingTask.label}
                  onChange={e => setEditingTask({ ...editingTask, label: e.target.value })}
                />
                <input
                  type="number"
                  value={editingTask.value}
                  onChange={e => setEditingTask({ ...editingTask, value: e.target.value })}
                  style={{ width: 60 }}
                />
                <button onClick={confirmEditTask}>✅</button>
              </>
            ) : (
              <>
                ✅ {task.label} — <strong>{task.value} pts</strong>{' '}
                <button onClick={() => startEditTask(task)}>✏️</button>{' '}
                <button onClick={() => handleDeleteTask(task.id)}>🗑️</button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '1rem' }}>
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
          style={{ width: 80, marginLeft: 8 }}
        />
        <button onClick={handleAddTask}>➕ Ajouter tâche</button>
      </div>

      <h2 style={{ marginTop: '2rem' }}>🎁 Récompenses disponibles</h2>
      <ul>
        {rewards.map(reward => (
          <li key={reward.id}>
            {editingRewardId === reward.id ? (
              <>
                <input
                  type="text"
                  value={editingReward.label}
                  onChange={e => setEditingReward({ ...editingReward, label: e.target.value })}
                />
                <input
                  type="number"
                  value={editingReward.cost}
                  onChange={e => setEditingReward({ ...editingReward, cost: e.target.value })}
                  style={{ width: 60 }}
                />
                <button onClick={confirmEditReward}>✅</button>
              </>
            ) : (
              <>
                🎁 {reward.label} — <strong>{reward.cost} pts</strong>{' '}
                <button onClick={() => startEditReward(reward)}>✏️</button>{' '}
                <button onClick={() => handleDeleteReward(reward.id)}>🗑️</button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '1rem' }}>
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
          style={{ width: 80, marginLeft: 8 }}
        />
        <button onClick={handleAddReward}>➕ Ajouter récompense</button>
      </div>

      <h2 style={{ marginTop: '2rem' }}>⚠️ Conséquences disponibles</h2>
      <ul>
        {consequences.map(consequence => (
          <li key={consequence.id}>
            {editingConsequenceId === consequence.id ? (
              <>
                <input
                  type="text"
                  value={editingConsequence.label}
                  onChange={e => setEditingConsequence({ ...editingConsequence, label: e.target.value })}
                />
                <input
                  type="number"
                  value={editingConsequence.cost}
                  onChange={e => setEditingConsequence({ ...editingConsequence, cost: e.target.value })}
                  style={{ width: 60 }}
                />
                <button onClick={confirmEditConsequence}>✅</button>
              </>
            ) : (
              <>
                ⚠️ {consequence.label} — <strong>-{consequence.cost} pts</strong>{' '}
                <button onClick={() => startEditConsequence(consequence)}>✏️</button>{' '}
                <button onClick={() => handleDeleteConsequence(consequence.id)}>🗑️</button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '1rem' }}>
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
          style={{ width: 80, marginLeft: 8 }}
        />
        <button onClick={handleAddConsequence}>➕ Ajouter conséquence</button>
      </div>
    </div>
  )
}