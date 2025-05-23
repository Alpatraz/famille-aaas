import ChildTasks from './ChildTasks'

export default function TasksRewards({ user }) {
  return (
    <div>
      <ChildTasks name={user.displayName} userId={user.id} />
    </div>
  )
}