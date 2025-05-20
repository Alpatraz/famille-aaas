import ChildTasks from './ChildTasks'
import ChildCard from './ChildCard'
import { useState } from 'react'

export default function TasksRewards({ user }) {
  const [points, setPoints] = useState(0)

  return (
    <ChildCard name={user.displayName || 'Enfant'} points={points}>
      <ChildTasks name={user.displayName} initialPoints={points} uid={user.uid} onPointsChange={setPoints} />
    </ChildCard>
  )
}
