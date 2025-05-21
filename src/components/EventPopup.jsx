import { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/eventPopup.css";

export default function EventPopup({ event, onClose, onRefresh }) {
  const [form, setForm] = useState({ title: "", date: "", participants: [] });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        date: event.date,
        participants: event.participants || []
      });
    }
  }, [event]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleParticipant = (name) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.includes(name)
        ? prev.participants.filter((p) => p !== name)
        : [...prev.participants, name]
    }));
  };

  const handleUpdate = async () => {
    const ref = doc(db, "calendarEvents", event.id);
    await updateDoc(ref, form);
    onRefresh();
    onClose();
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Supprimer cet événement ?");
    if (!confirm) return;
    await deleteDoc(doc(db, "calendarEvents", event.id));
    onRefresh();
    onClose();
  };

  return (
    <div className="event-popup-overlay">
      <div className="event-popup">
        <h3>📆 Modifier l'événement</h3>

        <label>Titre</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />

        <label>Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => handleChange("date", e.target.value)}
        />

        <label>Participants</label>
        <div className="participant-select">
          {["Antoine", "Anna", "Alexandre", "Guillaume"].map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={form.participants.includes(name)}
                onChange={() => toggleParticipant(name)}
              />
              {name}
            </label>
          ))}
        </div>

        <div className="event-popup-buttons">
          <button onClick={handleUpdate}>💾 Enregistrer</button>
          <button onClick={handleDelete} className="delete-btn">
            🗑️ Supprimer
          </button>
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
