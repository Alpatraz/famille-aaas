// EventPopup.jsx
export default function EventPopup({ event, users, onClose, onDelete, onEdit }) {
  if (!event || !users) return null;

  const participants = (event.participants || []).map((uid) =>
    users.find((u) => u.id === uid)
  );

  return (
    <div className="event-modal">
      <div className="event-form">
        <h3>📌 {event.title}</h3>
        <p><strong>Date :</strong> {event.date}</p>
        <p><strong>Heure :</strong> {event.startTime}</p>
        <p><strong>Durée :</strong> {event.duration} min</p>
        <p><strong>Participants :</strong></p>
        <ul>
          {participants.map((u, i) =>
            u ? <li key={i}>{u.avatar || "👤"} {u.displayName}</li> : null
          )}
        </ul>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          {onEdit && (
            <button
              style={{ backgroundColor: "#1976d2", color: "white" }}
              onClick={() => onEdit(event)}
            >
              Modifier
            </button>
          )}
          {onDelete && (
            <button
              style={{ backgroundColor: "#c62828", color: "white" }}
              onClick={() => onDelete(event.id)}
            >
              Supprimer
            </button>
          )}
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
