import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', order: 0 },
  'yellow': { name: 'Jaune', color: '#ffd700', order: 1 },
  'orange': { name: 'Orange', color: '#ffa500', order: 2 },
  'green': { name: 'Verte', color: '#228b22', order: 3 },
  'blue': { name: 'Bleue', color: '#0000ff', order: 4 },
  'brown': { name: 'Brune', color: '#8b4513', order: 5 },
  'black': { name: 'Noire', color: '#000000', order: 6 }
};

export default function Karate({ user }) {
  const [activeTab, setActiveTab] = useState('progression');
  const [karateUsers, setKarateUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    day: 'lundi',
    time: '',
    duration: 60,
    type: 'group',
    participants: []
  });

  useEffect(() => {
    loadKarateData();
  }, []);

  const loadKarateData = async () => {
    try {
      // Load users with karate enabled
      const usersSnap = await getDocs(query(
        collection(db, 'users'), 
        where('practicesKarate', '==', true)
      ));
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setKarateUsers(usersData);

      // Load courses
      const coursesSnap = await getDocs(collection(db, 'karate_courses'));
      const coursesData = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);

      // Load competitions
      const competitionsSnap = await getDocs(collection(db, 'karate_competitions'));
      const competitionsData = competitionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompetitions(competitionsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading karate data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <div className="header-content">
          <h2>🥋 Karaté</h2>
          {user.role === 'parent' && (
            <button 
              className="settings-button"
              onClick={() => setShowSettings(true)}
            >
              ⚙️
            </button>
          )}
        </div>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'progression' ? 'active' : ''}`}
            onClick={() => setActiveTab('progression')}
          >
            📈 Progression
          </button>
          <button 
            className={`tab ${activeTab === 'cours' ? 'active' : ''}`}
            onClick={() => setActiveTab('cours')}
          >
            📚 Cours
          </button>
          <button 
            className={`tab ${activeTab === 'competitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('competitions')}
          >
            🏆 Compétitions
          </button>
        </div>
      </div>

      {activeTab === 'progression' && (
        <div className="progression-section">
          <div className="users-grid">
            {karateUsers.map(karateUser => (
              <div 
                key={karateUser.id} 
                className="user-karate-card"
                onClick={() => setSelectedUser(karateUser)}
              >
                <div className="belt-info">
                  <div 
                    className="current-belt"
                    style={{
                      background: BELT_COLORS[karateUser.currentBelt]?.color || '#fff',
                      color: karateUser.currentBelt === 'white' ? '#000' : '#fff'
                    }}
                  >
                    {karateUser.displayName} - {BELT_COLORS[karateUser.currentBelt]?.name}
                  </div>
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(karateUser.attendedClasses / karateUser.requiredClasses) * 100}%` 
                        }}
                      />
                    </div>
                    <div className="progress-text">
                      <span>{karateUser.attendedClasses} cours effectués</span>
                      <span className="remaining-classes">
                        {karateUser.requiredClasses - karateUser.attendedClasses} restants
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cours' && (
        <div className="courses-section">
          {user.role === 'parent' && (
            <div className="add-form">
              <input
                type="text"
                name="name"
                value={newCourse.name}
                onChange={handleInputChange}
                placeholder="Nom du cours"
                className="class-name-input"
              />
              <div className="class-time-inputs">
                <select
                  name="day"
                  value={newCourse.day}
                  onChange={handleInputChange}
                  className="day-select"
                >
                  <option value="lundi">Lundi</option>
                  <option value="mardi">Mardi</option>
                  <option value="mercredi">Mercredi</option>
                  <option value="jeudi">Jeudi</option>
                  <option value="vendredi">Vendredi</option>
                  <option value="samedi">Samedi</option>
                  <option value="dimanche">Dimanche</option>
                </select>
                <input
                  type="time"
                  name="time"
                  value={newCourse.time}
                  onChange={handleInputChange}
                  className="time-input"
                />
                <input
                  type="number"
                  name="duration"
                  value={newCourse.duration}
                  onChange={handleInputChange}
                  min="30"
                  max="180"
                  step="15"
                  className="duration-input"
                />
              </div>
              <button className="add-button">
                Ajouter le cours
              </button>
            </div>
          )}

          <div className="items-grid">
            {courses.map(course => (
              <div key={course.id} className="class-card">
                <div className="class-header">
                  <h4>{course.name}</h4>
                  <div className="class-time">
                    {course.day} à {course.time} ({course.duration} min)
                  </div>
                </div>
                <div className="participants-list">
                  {course.participants?.map(participant => (
                    <span key={participant.id} className="participant-tag">
                      {participant.name}
                    </span>
                  ))}
                </div>
                {user.role === 'parent' && (
                  <button className="delete-button">
                    🗑️ Supprimer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'competitions' && (
        <div className="competitions-section">
          <h3>🏆 Compétitions à venir</h3>
          {/* Competition content will go here */}
        </div>
      )}

      {selectedUser && (
        <Modal
          title={`🥋 Progression de ${selectedUser.displayName}`}
          onClose={() => setSelectedUser(null)}
        >
          <div className="user-progression">
            <div className="belt-history">
              <h3>Historique des ceintures</h3>
              {selectedUser.beltHistory?.map((entry, index) => (
                <div 
                  key={index}
                  className={`belt-entry ${entry.belt === selectedUser.currentBelt ? 'current' : ''}`}
                  style={{
                    background: BELT_COLORS[entry.belt]?.color || '#fff',
                    color: entry.belt === 'white' ? '#000' : '#fff'
                  }}
                >
                  <span className="belt-name">
                    {BELT_COLORS[entry.belt]?.name}
                  </span>
                  <span className="belt-date">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="courses-summary">
              <div className="courses-counts">
                <div className="course-stat">
                  <span className="stat-label">Cours privés</span>
                  <span className="stat-value">{selectedUser.privateLessons || 0}</span>
                </div>
                <div className="course-stat">
                  <span className="stat-label">Cours de groupe</span>
                  <span className="stat-value">{selectedUser.groupLessons || 0}</span>
                </div>
              </div>

              <div className="next-belt-progress">
                <div className="progress-label">
                  <span>Progression vers la prochaine ceinture</span>
                  <span>{selectedUser.attendedClasses} / {selectedUser.requiredClasses}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(selectedUser.attendedClasses / selectedUser.requiredClasses) * 100}%` 
                    }}
                  />
                </div>
                <div className="remaining-classes">
                  {selectedUser.requiredClasses - selectedUser.attendedClasses} cours restants
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}