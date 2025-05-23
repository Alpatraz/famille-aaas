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
      const names = usersSnap.docs.map(doc => doc.data().displayName || doc.id);
      setChildren(names);
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

  return (
    <div className="dashboard-section">
      <h2>📜 Historique</h2>

      <div className="filters">
        <select value={child} onChange={e => setChild(e.target.value)}>
          <option value="">Tous les enfants</option>
          {children.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="today">Aujourd’hui</option>
          <option value="3days">3 derniers jours</option>
          <option value="7days">7 derniers jours</option>
          <option value="30days">30 derniers jours</option>
        </select>
      </div>

      <ul className="history-list">
        {entries.length === 0 && <li>Aucune activité trouvée.</li>}
        {entries.map((e, i) => (
          <li key={e.id || i} className="history-item">
            <span className="badge">{e.userId}</span>
            {e.type === "task" && `✅ ${e.label} (+${e.value} pts)`}
            {e.type === "reward" && `🎁 ${e.label} (-${e.value} pts)`}
            {e.type === "consequence" && `⚠️ ${e.label} (-${e.value} pts)`}
            {" — "}
            {e.date ? format(e.date, "dd/MM/yyyy HH:mm") : "Date inconnue"}
            <button className="delete-btn" onClick={() => handleDelete(e)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
