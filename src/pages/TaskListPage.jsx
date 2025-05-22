import TaskList from './TaskList' // ← tu l’as déjà fait dans src/pages

export default function TaskListPage() {
  return (
    <div className="dashboard-section">
      <h2>🛠️ Gestion des tâches & récompenses</h2>
      <TaskList />
    </div>
  )
}
