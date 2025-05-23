import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collectionGroup,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import "../styles/history.css";

export default function Historique() {
  const [entries, setEntries] = useState([]);
  const [child, setChild] = useState("");
  const [period, setPeriod] = useState("today");
  const [children, setChildren] = useState([]);

  useEffect(() => {
    const loadChildren = async () => {
      const usersSnap = await getDocs(collectionGroup(db, "users"));
      const data = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChildren(data.filter(user => user.role === 'enfant'));
    };
    loadChildren();
  }, []);

  useEffect(() => {
    const fetchEntries = async () => {
      const all = await getDocs(collectionGroup(db, "taskHistory"));
      const now = new Date();
      let limit = new Date();
      
      if (period === "3days") limit.setDate(now.getDate() - 3);
      else if (period === "7days") limit.setDate(now.getDate() - 7);
      else if (period === "30days") limit.setDate(now.getDate() - 30);
      else limit.setHours(0, 0, 0, 0); // today

      const filtered = all.docs
        .map(doc => {
          const pathParts = doc.ref.path.split("/");
          const userId = pathParts[1];
          const rawDate = doc.data().date;
          const parsedDate = rawDate?.toDate?.() || new Date(rawDate);

          return {
            id: doc.id,
            ref: doc.ref,
            userId,
            ...doc.data(),
            date: parsedDate instanceof Date && !isNaN(parsedDate) ? parsedDate : null,
          };
        })
        .filter(entry => {
          const validUser = child ? entry.userId === child : true;
          const validDate = entry.date && entry.date >= limit;
          return validUser && validDate;
        })
        .sort((a, b) => b.date - a.date);

      setEntries(filtered);
    };

    fetchEntries();
  }, [child, period]);

  const handleDelete = async (entry) => {
    if (window.confirm(`Supprimer cette entrée pour ${entry.userId} ?`)) {
      await deleteDoc(entry.ref);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    }
  };

  const getTypeEmoji = (type) => {
    switch (type) {
      case 'task': return '✅';
      case 'reward': return '🎁';
      case 'consequence': return '⚠️';
      default: return '📝';
    }
  };

  return (
    <div className="dashboard-section">
      <h2>📜 Historique des activités</h2>

      <div className="filters">
        <select value={child} onChange={e => setChild(e.target.value)}>
          <option value="">👥 Tous les enfants</option>
          {children.map(c => (
            <option key={c.id} value={c.displayName}>
              {c.avatar} {c.displayName}
            </option>
          ))}
        </select>

        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="today">📅 Aujourd'hui</option>
          <option value="3days">3 derniers jours</option>
          <option value="7days">7 derniers jours</option>
          <option value="30days">30 derniers jours</option>
        </select>
      </div>

      <div className="history-list">
        {entries.length === 0 ? (
          <div className="empty-message">
            Aucune activité trouvée pour cette période.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className="badge">
                {children.find(c => c.displayName === entry.userId)?.avatar || '👤'} {entry.userId}
              </div>
              <div className="history-content">
                {getTypeEmoji(entry.type)} {entry.label}
                {entry.type === 'task' && ` (+${entry.value} pts)`}
                {entry.type === 'reward' && ` (-${entry.value} pts)`}
                {entry.type === 'consequence' && ` (-${entry.value} pts)`}
              </div>
              <div className="history-date">
                {format(entry.date, "dd/MM/yyyy HH:mm")}
              </div>
              <button 
                className="delete-btn"
                onClick={() => handleDelete(entry)}
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}