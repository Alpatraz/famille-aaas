import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs
} from 'firebase/firestore'
import { format } from 'date-fns'
import '../styles/tasks.css'

export default function ChildTasks({ name }) {
  const [pointsTotal, setPointsTotal] = useState(0)
  const [pointsToday, setPointsToday] = useState(0)
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [completedToday, setCompletedToday] = useState({ tasks: 0, rewards: 0 })

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const fetchData = async () => {
      const taskSnap = await getDocs(collection(db, 'tasks'))
      setTasks(taskSnap.docs.map(doc => ({ id: doc.id, done: false, ...doc.data() })))

      const rewardSnap = await getDocs(collection(db, 'rewards'))
      setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchPoints = async () => {
      const totalSnap = await getDoc(doc(db, 'points', name))
      setPointsTotal(totalSnap.exists() ? totalSnap.data().value : 0)

      const col = collection(db, 'taskHistory', name, today)
      const snap = await getDocs(col)

      let pts = 0, taskCount = 0, rewardCount = 0
      snap.docs.forEach(doc => {
        const data = doc.data()
        if (data.type === 'task') {
          pts += data.value
          taskCount++
        }
        if (data.type === 'reward') rewardCount++
      })
      setPointsToday(pts)
      setCompletedToday({ tasks: taskCount, rewards: rewardCount })
    }
    fetchPoints()
  }, [name])

  const handleTaskToggle = async (id) => {
    const task = tasks.find(t => t.id === id)
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
    setTasks(updated)

    const delta = task.done ? -task.value : task.value
    const newTotal = pointsTotal + delta
    setPointsTotal(newTotal)
    setPointsToday(prev => prev + delta)
    setCompletedToday(prev => ({ ...prev, tasks: prev.tasks + (task.done ? -1 : 1) }))

    await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true })

    if (!task.done) {
      await addDoc(collection(db, 'taskHistory', name, today), {
        label: task.label,
        value: task.value,
        type: 'task',
        date: new Date()
      })
    }

    setTimeout(() => {
      setTasks(prev =>
        prev.map(t => t.id === id ? { ...t, done: false } : t)
      )
    }, 3000)
  }

  const handleRewardClick = async (cost, label) => {
    if (pointsTotal >= cost) {
      const newTotal = pointsTotal - cost
      setPointsTotal(newTotal)
      setCompletedToday(prev => ({ ...prev, rewards: prev.rewards + 1 }))
      await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true })

      await addDoc(collection(db, 'taskHistory', name, today), {
        label,
        value: cost,
        type: 'reward',
        date: new Date()
      })
    } else {
      alert('⛔ Pas assez de points.')
    }
  }

  return (
    <div className="dashboard-section">
      <h3>🧒 {name}</h3>
      <div className="tag">🔄 {pointsToday} pts aujourd’hui</div>
      <div className="tag">🎯 {pointsTotal} pts au total</div>
      <div className="tag">✅ {completedToday.tasks} tâches faites</div>
      <div className="tag">🎁 {completedToday.rewards} récompenses prises</div>

      <h4 style={{ marginTop: '1rem' }}>✅ Tâches</h4>
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id}>
            {task.label} <span className="tag">+{task.value} pts</span>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleTaskToggle(task.id)}
            />
          </li>
        ))}
      </ul>

      <h4 style={{ marginTop: '1rem' }}>🎁 Récompenses</h4>
      <ul className="task-list">
        {rewards.map(reward => (
          <li key={reward.id}>
            {reward.label} <span className="tag">{reward.cost} pts</span>
            <button onClick={() => handleRewardClick(reward.cost, reward.label)}>Utiliser 🎁</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
