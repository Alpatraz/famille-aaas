import './eventPopup.css';

export default function EventPopup({ event, users, onClose, onDelete, onEdit }) {
  if (!event || !users) return null;

  const participants = (event.participants || [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter(Boolean);

  return (
    <div className="event-modal-overlay">
      <div className="event-modal-content">
        <h3>📌 {event.title}</h3>
        
        <div className="event-details">
          <div className="event-detail">
            <strong>📅 Date :</strong> {event.date}
          </div>
          <div className="event-detail">
            <strong>⏰ Heure :</strong> {event.startTime}
          </div>
          <div className="event-detail">
            <strong>⌛ Durée :</strong> {event.duration} minutes
          </div>
        </div>

        <div className="event-participants">
          <strong>👥 Participants :</strong>
          <div className="participant-list">
            {participants.map((u, i) => (
              <div key={i} className="participant-item">
                <span className="participant-avatar">{u.avatar || "👤"}</span>
                <span className="participant-name">{u.displayName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="event-actions">
          {onEdit && (
            <button
              className="edit-button"
              onClick={() => onEdit(event)}
            >
              ✏️ Modifier
            </button>
          )}
          {onDelete && (
            <button
              className="delete-button"
              onClick={() => onDelete(event.id)}
            >
              🗑️ Supprimer
            </button>
          )}
          <button 
            className="close-button"
            onClick={onClose}
          >
            ❌ Fermer
          </button>
        </div>
      </div>
    </div>
  );
}