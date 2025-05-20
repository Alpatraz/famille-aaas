import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import "../styles/calendar.css";

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "calendarEvents"));
      const raw = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(raw);

      const userSnap = await getDocs(collection(db, "users"));
      const allUsers = userSnap.docs.map((d) => d.data());
      setUsers(allUsers);
    };
    fetchData();
  }, []);

  const getUserStyle = (uid) => {
    const user = users.find((u) => u.uid === uid);
    return user ? { backgroundColor: user.color, borderColor: user.color } : {};
  };

  const getEmoji = (uid) => {
    const user = users.find((u) => u.uid === uid);
    return user?.avatar || "👤";
  };

  return (
    <div className="calendar-grid">
      <div className="calendar-header"></div>
      {days.map((day) => (
        <div className="calendar-header" key={day}>{day}</div>
      ))}

      {users.map((user) => (
        <>
          <div className="calendar-user-name" key={`name-${user.uid}`}>
            <span className="avatar-label" style={{ backgroundColor: user.color }}>{user.avatar}</span>
            {user.displayName}
          </div>

          {days.map((day) => (
            <div className="calendar-cell" key={`${user.uid}-${day}`}>
              {events.filter(e => e.day === day && e.users.includes(user.uid)).map((ev) => (
                <div
                  key={ev.id}
                  className="calendar-event"
                  style={getUserStyle(user.uid)}
                  onClick={() => alert(`${ev.title} - ${ev.time} (${ev.duration} min)`)}
                >
                  {ev.title} ({getEmoji(user.uid)})
                </div>
              ))}
            </div>
          ))}
        </>
      ))}
    </div>
  );
}
