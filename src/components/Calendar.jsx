import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import "../styles/calendar.css";
import EventPopup from "./EventPopup";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [weather, setWeather] = useState([]);
  const [popupEvent, setPopupEvent] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const snap = await getDocs(collection(db, "calendarEvents"));
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    };

    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    };

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=45.7&longitude=-73.6&daily=temperature_2m_max,weathercode&timezone=auto`
        );
        const data = await response.json();
        setWeather(
          data.daily.time.map((date, i) => ({
            date,
            icon: weatherIcon(data.daily.weathercode[i]),
            temp: data.daily.temperature_2m_max[i],
          }))
        );
      } catch (err) {
        console.error("Erreur météo", err);
      }
    };

    fetchEvents();
    fetchUsers();
    fetchWeather();
  }, []);

  const weatherIcon = (code) => {
    const map = {
      0: "☀️",
      1: "🌤️",
      2: "⛅",
      3: "☁️",
      45: "🌫️",
      48: "🌫️",
      51: "🌦️",
      61: "🌧️",
      71: "🌨️",
      95: "⛈️",
    };
    return map[code] || "❓";
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-grid">
        {DAYS.map((day, i) => (
          <div className="calendar-day" key={day}>
            <div className="day-header">
              <div>
                <strong>{day}</strong>
              </div>
              {weather[i] && (
                <div className="weather">
                  <span>{weather[i].icon}</span> {weather[i].temp}°C
                </div>
              )}
            </div>

            <div className="day-events">
              {events
                .filter((e) => e.day === day)
                .map((e) => {
                  const color =
                    e.participants?.length === 1
                      ? users.find((u) => u.displayName === e.participants[0])?.color || "#ddd"
                      : "#ccc";
                  const label =
                    e.participants?.map((p) => users.find((u) => u.displayName === p)?.avatar || "👤").join(" ") +
                    " - " + e.title;

                  return (
                    <div
                      key={e.id}
                      className="event-bubble"
                      style={{ backgroundColor: color }}
                      onClick={() => setPopupEvent(e)}
                    >
                      {label}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {popupEvent && (
        <EventPopup
          event={popupEvent}
          onClose={() => setPopupEvent(null)}
          users={users}
        />
      )}
    </div>
  );
}
