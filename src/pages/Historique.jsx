import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'

export default function Historique() {
  const [entries, setEntries] = useState([])
  const [child, setChild] = useState('')
  const [period, setPeriod] = useState('today')
  const [children, setChildren] = useState([])

  useEffect(() => {
    const loadUsers = async () => {
      const snap = await getDocs(collectionGroup(db, 'users'))
      const users = snap.docs.map(doc => doc.data().displayName || doc.id)
      setChildren(users)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      let dateLimit = new Date()
      if (period === '3days') dateLimit.setDate(dateLimit.getDate() - 3)
      if (period === '7days') dateLimit.setDate(dateLimit.getDate() - 7)
      if (period === '30days') dateLimit.setDate(dateLimit.getDate() - 30)

      const allDocs = await getDocs(collectionGroup(db, 'taskHistory'))
      const data = allDocs.docs
        .map(doc => ({ id: doc.id, ...doc.data(), path: doc.ref.path }))
        .filter(entry => {
          const isChild = child ? entry.path.includes(`/taskHistory/${child}/`) : true
          const isRecent = new Date(entry.date?.toDate?.() || entry.date) >= dateLimit
          return isChild && isRecent
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      setEntries(data)
    }

    fetchData()
  }, [child, period])

  return (
    <div className="dashboard-section">
      <h2>📊 Historique</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select value={child} onChange={e => setChild(e.target.value)}>
          <option value=''>Tous les enfants</option>
          {children.map(c => <option key={c}>{c}</option>)}
        </select>

        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value='today'>Aujourd’hui</option>
          <option value='3days'>3 derniers jours</option>
          <option value='7days'>7 derniers jours</option>
          <option value='30days'>30 derniers jours</option>
        </select>
      </div>

      <ul>
        {entries.length === 0 && <li>Aucune activité trouvée</li>}
        {entries.map((e, i) => (
          <li key={i}>
            {e.type === 'task'
              ? `✅ ${e.label} (+${e.value} pts)`
              : `🎁 ${e.label} (-${e.value} pts)`} — {format(new Date(e.date), 'dd/MM/yyyy HH:mm')}
          </li>
        ))}
      </ul>
    </div>
  )
}