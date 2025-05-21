// TasksRewards.jsx
import ChildTasks from './ChildTasks'

export default function TasksRewards({ user }) {
  return (
    <div>
      <ChildTasks name={user.displayName} />
    </div>
  )
}
