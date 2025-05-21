// ChildTasks.jsx
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs
} from 'firebase/firestore'
import { format } from 'date-fns'
import AccordionSection from './AccordionSection'
import '../styles/tasks.css'

export default function ChildTasks({ name }) {
  const [pointsTotal, setPointsTotal] = useState(0)
  const [pointsToday, setPointsToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])

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
      const todaySum = snap.docs
        .filter(doc => doc.data().type === 'task')
        .reduce((sum, doc) => sum + doc.data().value, 0)
      setPointsToday(todaySum)

      setLoading(false)
    }

    fetchPoints()
  }, [name])

  const handleTaskToggle = async (id) => {
    const task = tasks.find(t => t.id === id)
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    )
    setTasks(updated)

    const taskDone = !task.done
    const delta = taskDone ? task.value : -task.value
    const newTotal = pointsTotal + delta
    setPointsTotal(newTotal)
    if (taskDone) setPointsToday(prev => prev + task.value)
    else setPointsToday(prev => prev - task.value)

    await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true })

    if (taskDone) {
      await addDoc(collection(db, 'taskHistory', name, today), {
        label: task.label,
        value: task.value,
        type: 'task',
        date: new Date()
      })

      setTimeout(() => {
        setTasks(prev =>
          prev.map(t => t.id === id ? { ...t, done: false } : t)
        )
      }, 3000)
    }
  }

  const handleRewardClick = async (cost, label) => {
    if (pointsTotal >= cost) {
      const newTotal = pointsTotal - cost
      setPointsTotal(newTotal)
      await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true })

      await addDoc(collection(db, 'taskHistory', name, today), {
        label,
        value: cost,
        type: 'reward',
        date: new Date()
      })

      alert(`🎁 ${name} a utilisé une récompense !`)
    } else {
      alert(`⛔ Pas assez de points.`)
    }
  }

  if (loading) return <p>Chargement...</p>

  return (
    <div className="dashboard-section">
      <h3>🧒 {name}</h3>
      <div className="tag">🔄 {pointsToday} pts aujourd’hui</div>
      <div className="tag">🎯 {pointsTotal} pts au total</div>

      <AccordionSection title="✅ Tâches" defaultOpen={true}>
        <ul className="task-list">
          {tasks.map(task => (
            <li key={task.id} className="task-row">
              <span className="task-label">{task.label}</span>
              <span className="tag">+{task.value} pts</span>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => handleTaskToggle(task.id)}
              />
            </li>
          ))}
        </ul>
      </AccordionSection>

      <AccordionSection title="🎁 Récompenses" defaultOpen={true}>
        <ul className="reward-list">
          {rewards.map(reward => (
            <li key={reward.id} className="reward-row">
              <span className="reward-label">{reward.label}</span>
              <span className="tag">{reward.cost} pts</span>
              <button
                className="reward-button"
                onClick={() => handleRewardClick(reward.cost, reward.label)}
              >
                Utiliser 🎁
              </button>
            </li>
          ))}
        </ul>
      </AccordionSection>
    </div>
  )
}
