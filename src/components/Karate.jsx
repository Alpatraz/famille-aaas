import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, setDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', order: 0 },
  'white-yellow': { name: 'Blanche / Jaune', color: '#fff5b3', order: 1 },
  'yellow': { name: 'Jaune', color: '#ffd700', order: 2 },
  'yellow-orange': { name: 'Jaune / Orange', color: '#ffb347', order: 3 },
  'orange': { name: 'Orange', color: '#ffa500', order: 4 },
  'orange-purple': { name: 'Orange / Mauve', color: '#d8a0df', order: 5 },
  'purple': { name: 'Mauve', color: '#800080', order: 6 },
  'purple-green': { name: 'Mauve / Verte', color: '#50c878', order: 7 },
  'green': { name: 'Verte', color: '#228b22', order: 8 },
  'green-blue': { name: 'Verte / Bleue', color: '#0096c7', order: 9 },
  'blue': { name: 'Bleue', color: '#0000ff', order: 10 },
  'blue-brown': { name: 'Bleue / Brune', color: '#a0522d', order: 11 },
  'brown': { name: 'Brune', color: '#8b4513', order: 12 },
  'brown-black': { name: 'Brune / Noire', color: '#3a3a3a', order: 13 },
  'black': { name: 'Noire', color: '#000000', order: 14 },
  'black-1': { name: 'Noire 1ère Dan', color: '#000000', order: 15 },
  'black-2': { name: 'Noire 2ème Dan', color: '#000000', order: 16 },
  'black-3': { name: 'Noire 3ème Dan', color: '#000000', order: 17 }
};

const WEEKDAYS = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8; // Start at 8:00
  return `${hour.toString().padStart(2, '0')}:00`;
});

export default function Karate({ user }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [karateUsers, setKarateUsers] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupClasses, setGroupClasses] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [newClass, setNewClass] = useState({
    day: 'Lundi',
    time: '17:00',
    participants: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load karate users
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('practicesKarate', '==', true))
      );
      
      const users = [];
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const karateData = await getDoc(doc(db, 'karate_users', userDoc.id));
        
        users.push({
          id: userDoc.id,
          displayName: userData.displayName,
          avatar: userData.avatar,
          ...karateData.data()
        });
      }
      setKarateUsers(users);

      // Load weekly theme
      const themeDoc = await getDoc(doc(db, 'karate_settings', 'weeklyTheme'));
      if (themeDoc.exists()) {
        setWeeklyTheme(themeDoc.data().theme);
      }

      // Load class schedules
      const schedulesDoc = await getDoc(doc(db, 'karate_settings', 'schedules'));
      if (schedulesDoc.exists()) {
        const data = schedulesDoc.data();
        setGroupClasses(data.groupClasses || []);
      }

      // Load attendance
      const attendanceDoc = await getDoc(doc(db, 'karate_settings', 'attendance'));
      if (attendanceDoc.exists()) {
        setAttendance(attendanceDoc.data());
      }

    } catch (error) {
      console.error('Error loading karate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (userData) => {
    if (!userData?.requiredClasses) return 0;
    const attended = userData.attendedClasses || 0;
    return Math.min(100, (attended / userData.requiredClasses) * 100);
  };

  const handleSaveProfile = async (user, updatedData) => {
    if (!user?.id) {
      console.error('No user ID provided for profile update');
      return;
    }

    try {
      const karateUserRef = doc(db, 'karate_users', user.id);
      
      // Add new belt to history if it changed
      if (updatedData.currentBelt !== user.currentBelt) {
        updatedData.beltHistory = [
          ...(user.beltHistory || []),
          {
            belt: updatedData.currentBelt,
            date: new Date().toISOString()
          }
        ];
      }

      await updateDoc(karateUserRef, updatedData);
      await loadData();
    } catch (error) {
      console.error('Error updating karate profile:', error);
      alert('Erreur lors de la sauvegarde du profil');
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await setDoc(doc(db, 'karate_settings', 'schedules'), {
        groupClasses
      });
      setEditingSchedule(false);
      await loadData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Erreur lors de la sauvegarde du planning');
    }
  };

  const handleAddClass = () => {
    setGroupClasses([...groupClasses, { ...newClass }]);
    setNewClass({ day: 'Lundi', time: '17:00', participants: [] });
  };

  const handleRemoveClass = (index) => {
    setGroupClasses(groupClasses.filter((_, i) => i !== index));
  };

  const renderScheduleSettings = () => (
    <div className="schedule-settings">
      <h3>📅 Planning des cours</h3>
      
      <div className="schedule-section">
        <h4>Cours de groupe</h4>
        {groupClasses.map((classInfo, index) => (
          <div key={index} className="class-item">
            <span>{classInfo.day} à {classInfo.time}</span>
            <div className="participants">
              {classInfo.participants.map(userId => {
                const user = karateUsers.find(u => u.id === userId);
                return user ? (
                  <span key={userId} className="participant-tag">
                    {user.avatar} {user.displayName}
                  </span>
                ) : null;
              })}
            </div>
            {editingSchedule && (
              <button onClick={() => handleRemoveClass(index)}>
                🗑️
              </button>
            )}
          </div>
        ))}

        {editingSchedule && (
          <div className="add-class-form">
            <select
              value={newClass.day}
              onChange={e => setNewClass({ ...newClass, day: e.target.value })}
            >
              {WEEKDAYS.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <input
              type="time"
              value={newClass.time}
              onChange={e => setNewClass({ ...newClass, time: e.target.value })}
            />
            <div className="participant-selector">
              {karateUsers.map(user => (
                <label key={user.id} className="participant-option">
                  <input
                    type="checkbox"
                    checked={newClass.participants.includes(user.id)}
                    onChange={e => {
                      const participants = e.target.checked
                        ? [...newClass.participants, user.id]
                        : newClass.participants.filter(id => id !== user.id);
                      setNewClass({ ...newClass, participants });
                    }}
                  />
                  {user.avatar} {user.displayName}
                </label>
              ))}
            </div>
            <button onClick={handleAddClass}>
              Ajouter
            </button>
          </div>
        )}
      </div>

      {user.role === 'parent' && (
        <div className="schedule-actions">
          {editingSchedule ? (
            <>
              <button onClick={handleSaveSchedule} className="save-button">
                💾 Enregistrer
              </button>
              <button
                onClick={() => setEditingSchedule(false)}
                className="cancel-button"
              >
                ❌ Annuler
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditingSchedule(true)}
              className="edit-button"
            >
              ✏️ Modifier
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderProfileSettings = () => (
    <div className="karate-profile-settings">
      <div className="profile-grid">
        {karateUsers.map(user => (
          <div key={user.id} className="profile-card">
            <div className="profile-header">
              <span className="profile-avatar">{user.avatar}</span>
              <h3>{user.displayName}</h3>
            </div>

            <div className="belt-section">
              <label>Ceinture actuelle</label>
              <select
                value={user.currentBelt || 'white'}
                onChange={(e) => handleSaveProfile(user, {
                  ...user,
                  currentBelt: e.target.value
                })}
              >
                {Object.entries(BELT_COLORS).map(([value, { name }]) => (
                  <option key={value} value={value}>{name}</option>
                ))}
              </select>
            </div>

            <div className="competition-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={user.doesCompetition || false}
                  onChange={(e) => handleSaveProfile(user, {
                    ...user,
                    doesCompetition: e.target.checked
                  })}
                />
                Fait de la compétition
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={user.hasPrivateLessons || false}
                  onChange={(e) => handleSaveProfile(user, {
                    ...user,
                    hasPrivateLessons: e.target.checked
                  })}
                />
                Prend des cours privés
              </label>

              {user.hasPrivateLessons && (
                <div className="private-lessons-schedule">
                  <label>Fréquence des cours privés</label>
                  <select
                    value={user.privateLessonsFrequency || 'weekly'}
                    onChange={(e) => handleSaveProfile(user, {
                      ...user,
                      privateLessonsFrequency: e.target.value
                    })}
                  >
                    <option value="weekly">Hebdomadaire</option>
                    <option value="biweekly">Bihebdomadaire</option>
                  </select>

                  <div className="private-lesson-time">
                    <label>Jour du cours privé</label>
                    <select
                      value={user.privateLessonsSchedule?.day || 'Lundi'}
                      onChange={(e) => handleSaveProfile(user, {
                        ...user,
                        privateLessonsSchedule: {
                          ...user.privateLessonsSchedule,
                          day: e.target.value
                        }
                      })}
                    >
                      {WEEKDAYS.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>

                    <label>Heure du cours privé</label>
                    <select
                      value={user.privateLessonsSchedule?.time || '17:00'}
                      onChange={(e) => handleSaveProfile(user, {
                        ...user,
                        privateLessonsSchedule: {
                          ...user.privateLessonsSchedule,
                          time: e.target.value
                        }
                      })}
                    >
                      {HOURS.map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProgressionContent = () => (
    <div className="progression-section">
      {karateUsers.map(userData => (
        <div key={userData.id} className="user-karate-card">
          <div className="belt-info">
            <div className="current-belt" style={{
              backgroundColor: BELT_COLORS[userData.currentBelt]?.color || '#ffffff',
              border: userData.currentBelt === 'white' ? '1px solid #ddd' : 'none',
              color: ['white', 'white-yellow', 'yellow', 'yellow-orange'].includes(userData.currentBelt) ? '#1e293b' : '#ffffff'
            }}>
              <span>{userData.displayName} - {BELT_COLORS[userData.currentBelt]?.name}</span>
            </div>
            
            <div className="belt-dates">
              {userData.beltHistory?.map((history, index) => (
                <div key={index} className="belt-date">
                  {BELT_COLORS[history.belt]?.name}: {new Date(history.date).toLocaleDateString()}
                </div>
              ))}
            </div>

            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${calculateProgress(userData)}%` }}
                />
              </div>
              <div className="progress-text">
                {userData.attendedClasses || 0} / {userData.requiredClasses || 20} cours
                {userData.requiredClasses && (
                  <span className="remaining-classes">
                    {` (${userData.requiredClasses - (userData.attendedClasses || 0)} cours restants)`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {weeklyTheme && (
        <div className="theme-section">
          <h3>📝 Thème de la semaine</h3>
          <p>{weeklyTheme}</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
        <div className="section-buttons">
          <button 
            className="section-button"
            onClick={() => setSelectedSection('progression')}
          >
            📊 Progression
          </button>
          <button 
            className="section-button"
            onClick={() => setSelectedSection('schedule')}
          >
            📅 Planning
          </button>
          {user.role === 'parent' && (
            <button 
              className="section-button"
              onClick={() => setSelectedSection('settings')}
            >
              ⚙️ Paramètres
            </button>
          )}
        </div>
      </div>

      {selectedSection && (
        <Modal
          title={
            selectedSection === 'progression' ? '📊 Progression Karaté' :
            selectedSection === 'schedule' ? '📅 Planning des cours' :
            '⚙️ Paramètres Karaté'
          }
          onClose={() => setSelectedSection(null)}
        >
          {selectedSection === 'progression' ? renderProgressionContent() :
           selectedSection === 'schedule' ? renderScheduleSettings() :
           renderProfileSettings()}
        </Modal>
      )}
    </div>
  );
}