import ChildTasks from './ChildTasks'

export default function TasksRewards({ user }) {
  if (!user || !user.uid) {
    return <p>Chargement des données utilisateur...</p>
  }

  return (
    <div>
      <ChildTasks name={user.displayName} userId={user.uid} />
    </div>
  )
}