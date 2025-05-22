// AddEventModal.jsx
import { useState, useEffect } from "react";

export default function AddEventModal({ onClose, onSave, users, initialData = null }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [duration, setDuration] = useState(60);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Sécurité : attend que users soit bien défini
  if (!users || !Array.isArray(users)) return null;

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDate(initialData.date || "");
      setStartTime(initialData.startTime || "08:00");
      setDuration(initialData.duration || 60);
      setSelectedUsers(initialData.participants || []);
    }
  }, [initialData]);

  const toggleUser = (uid) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const eventData = {
      title,
      date,
      startTime,
      duration: parseInt(duration),
      participants: selectedUsers,
      ...(initialData?.id && { id: initialData.id }) // inclut l'id en cas de modification
    };
    onSave(eventData);
  };

  return (
    <div className="event-modal">
      <form className="event-form" onSubmit={handleSubmit}>
        <h3>{initialData ? "✏️ Modifier" : "➕ Nouvel"} événement</h3>

        <label>Titre</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

        <label>Heure de début</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />

        <label>Durée (minutes)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required />

        <label>Participants</label>
        <div className="participants">
          {users.map((u) => (
            <label
              key={u.id}
              style={{
                backgroundColor: selectedUsers.includes(u.id) ? "#def" : "transparent",
                borderRadius: "4px",
                padding: "4px"
              }}
            >
              <input
                type="checkbox"
                checked={selectedUsers.includes(u.id)}
                onChange={() => toggleUser(u.id)}
              />
              {u.avatar || "👤"} {u.displayName}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button type="submit">{initialData ? "Modifier" : "Enregistrer"}</button>
          <button type="button" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
