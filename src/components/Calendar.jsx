import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import "../styles/Calendar.css";
import { addDays, format, startOfWeek } from "date-fns";
import fr from "date-fns/locale/fr";

export default function Calendar({ users = [], events = [], onEventClick, onAddEvent }) {
  const [weather, setWeather] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const DAYS = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i + weekOffset * 7)
  );

  const fetchWeather = async () => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=45.69&longitude=-73.63&daily=temperature_2m_max,weathercode&timezone=America/Toronto`
      );
      const data = await response.json();
      setWeather(
        data.daily.time.map((date, i) => ({
          date,
          icon: weatherIcon(data.daily.weathercode[i]),
          temp: Math.round(data.daily.temperature_2m_max[i])
        }))
      );
    } catch (err) {
      console.error("Erreur météo", err);
    }
  };

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

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-arrow prev" onClick={() => setWeekOffset(weekOffset - 1)}>
            <span>←</span>
          </button>
          <h2 className="calendar-week-label">
            Semaine du {format(DAYS[0], 'dd MMMM yyyy', { locale: fr })}
          </h2>
          <button className="nav-arrow next" onClick={() => setWeekOffset(weekOffset + 1)}>
            <span>→</span>
          </button>
        </div>
        {onAddEvent && (
          <button className="add-event-button" onClick={onAddEvent}>
            ➕ Ajouter un événement
          </button>
        )}
      </div>

      <div className="calendar-grid">
        {DAYS.map((day, i) => (
          <div
            className={`calendar-day ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'today' : ''}`}
            key={i}
          >
            <div className="day-header">
              <div>
                <strong>{format(day, 'EEEE', { locale: fr })}</strong>
                <span className="day-date">{format(day, 'dd/MM')}</span>
              </div>
              {weather[i] && (
                <div className="weather">
                  {weather[i].icon} {weather[i].temp}°
                </div>
              )}
            </div>

            <div className="day-events">
              {events
                .filter((e) => e.date === format(day, 'yyyy-MM-dd'))
                .map((e) => {
                  const participantData = (e.participants || [])
                    .map((id) => users.find((u) => u.id === id))
                    .filter(Boolean);

                  const color =
                    participantData.length === 1
                      ? participantData[0].color || "#ddd"
                      : participantData.length > 1
                      ? "#bbb"
                      : "#eee";

                  const avatars = participantData.length > 0
                    ? participantData.map((u) => u.avatar || "👤").join(" ")
                    : "👥";

                  return (
                    <div
                      key={e.id}
                      className="event-bubble"
                      style={{ backgroundColor: color }}
                      onClick={() => onEventClick && onEventClick(e)}
                    >
                      {avatars} {e.title}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}