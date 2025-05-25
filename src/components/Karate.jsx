import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
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

const WEEKDAYS_MAP = {
  'Lundi': 1,
  'Mardi': 2,
  'Mercredi': 3,
  'Jeudi': 4,
  'Vendredi': 5,
  'Samedi': 6,
  'Dimanche': 0
};

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
    name: '',
    day: 'Lundi',
    time: '17:00',
    duration: 60,
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

  const toggleParticipant = (userId) => {
    setNewClass(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setNewClass(prev => ({
      ...prev,
      name: value
    }));
  };

  const getNextDayDate = (targetDay) => {
    const today = new Date();
    const targetDayNum = WEEKDAYS_MAP[targetDay];
    const todayNum = today.getDay();
    
    let daysToAdd = targetDayNum - todayNum;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate;
  };

  const handleAddClass = async () => {
    if (!newClass.name.trim()) {
      alert('Veuillez donner un nom au cours');
      return;
    }

    try {
      // Add to group classes
      const updatedClasses = [...groupClasses, { ...newClass }];
      await setDoc(doc(db, 'karate_settings', 'schedules'), {
        groupClasses: updatedClasses
      });
      setGroupClasses(updatedClasses);

      // Add to calendar
      const nextDate = getNextDayDate(newClass.day);
      nextDate.setHours(parseInt(newClass.time.split(':')[0]), parseInt(newClass.time.split(':')[1]), 0);

      const participants = newClass.participants.map(id => {
        const user = karateUsers.find(u => u.id === id);
        return {
          id,
          name: user?.displayName || '',
          avatar: user?.avatar || '👤'
        };
      });

      await addDoc(collection(db, 'events'), {
        title: `🥋 ${newClass.name}`,
        date: nextDate.toISOString().split('T')[0],
        startTime: newClass.time,
        duration: newClass.duration,
        type: 'karate',
        participants: newClass.participants,
        recurring: true,
        day: newClass.day
      });

      setNewClass({
        name: '',
        day: 'Lundi',
        time: '17:00',
        duration: 60,
        participants: []
      });
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Erreur lors de l\'ajout du cours');
    }
  };

  const handleRemoveClass = async (index) => {
    try {
      const updatedClasses = groupClasses.filter((_, i) => i !== index);
      await setDoc(doc(db, 'karate_settings', 'schedules'), {
        groupClasses: updatedClasses
      });
      setGroupClasses(updatedClasses);

      // Remove from calendar
      const removedClass = groupClasses[index];
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('type', '==', 'karate'),
        where('title', '==', `🥋 ${removedClass.name}`)
      );
      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }
    } catch (error) {
      console.error('Error removing class:', error);
      alert('Erreur lors de la suppression du cours');
    }
  };

  const renderScheduleSettings = () => (
    <div className="schedule-settings">
      <div className="section-header">
        <h3>📅 Planning des cours</h3>
        {user.role === 'parent' && (
          <button onClick={() => setEditingSchedule(!editingSchedule)} className="edit-button">
            {editingSchedule ? '💾 Enregistrer' : '✏️ Modifier'}
          </button>
        )}
      </div>

      <div className="add-form">
        <input
          type="text"
          value={newClass.name}
          onChange={handleNameChange}
          placeholder="Nom du cours"
          className="class-name-input"
        />
        
        <div className="class-time-inputs">
          <select
            value={newClass.day}
            onChange={e => setNewClass({ ...newClass, day: e.target.value })}
            className="day-select"
          >
            {WEEKDAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          
          <input
            type="time"
            value={newClass.time}
            onChange={e => setNewClass({ ...newClass, time: e.target.value })}
            className="time-input"
          />
          
          <input
            type="number"
            value={newClass.duration}
            onChange={e => setNewClass({ ...newClass, duration: parseInt(e.target.value) })}
            min="15"
            max="180"
            step="15"
            placeholder="Durée (min)"
            className="duration-input"
          />
        </div>

        <div className="participant-selector">
          {karateUsers.map(user => (
            <div
              key={user.id}
              className={`participant-tag ${newClass.participants.includes(user.id) ? 'selected' : ''}`}
              onClick={() => toggleParticipant(user.id)}
            >
              {user.avatar} {user.displayName}
            </div>
          ))}
        </div>

        <button onClick={handleAddClass} className="add-button">
          Ajouter le cours
        </button>
      </div>

      <div className="items-grid">
        {groupClasses.map((classInfo, index) => (
          <div key={index} className="class-card">
            <div className="class-header">
              <h4>{classInfo.name}</h4>
              <div className="class-time">
                {classInfo.day} à {classInfo.time} ({classInfo.duration} min)
              </div>
            </div>
            
            <div className="participants-list">
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
              <button onClick={() => handleRemoveClass(index)} className="delete-button">
                🗑️ Supprimer
              </button>
            )}
          </div>
        ))}
      </div>
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