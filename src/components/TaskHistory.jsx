import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { format } from 'date-fns'

export default function TaskHistory({ child }) {
  const [history, setHistory] = useState([])
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    const ref = collection(db, 'taskHistory', child, today)

    const unsubscribe = onSnapshot(ref, snapshot => {
      const entries = snapshot.docs.map(doc => doc.data())
      console.log(`[Realtime] ${child} ${today}:`, entries)
      setHistory(entries)
    })

    return () => unsubscribe()
  }, [child])

  return (
    <div>
      <h3>📜 Historique de {child} ({today})</h3>
      <ul>
        {history.length === 0 && <li>Aucune activité aujourd’hui.</li>}
        {history.map((entry, i) => (
          <li key={i}>
            {entry.type === 'task'
              ? `✅ ${entry.label} (+${entry.value} pts)`
              : `🎁 ${entry.label} (${entry.value} pts)`}
          </li>
        ))}
      </ul>
    </div>
  )
}
