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

export default function Karate({ user }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [karateUsers, setKarateUsers] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupClasses, setGroupClasses] = useState([]);
  const [showClassList, setShowClassList] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
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

    } catch (error) {
      console.error('Error loading karate data:', error);
    } finally {
      setLoading(false);
    }
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

  const getNextFourWeeks = (startDate) => {
    const dates = [];
    const date = new Date(startDate);
    
    for (let i = 0; i < 52; i++) { // Generate events for a full year
      dates.push(new Date(date));
      date.setDate(date.getDate() + 7);
    }
    
    return dates;
  };

  const handleAddClass = async () => {
    const classData = editingClass || newClass;
    
    if (!classData.name.trim()) {
      alert('Veuillez donner un nom au cours');
      return;
    }

    try {
      const classId = editingClass?.id || Date.now().toString();

      if (editingClass) {
        // Update existing class
        const updatedClasses = groupClasses.map(c => 
          c.id === editingClass.id ? { ...classData, id: editingClass.id } : c
        );
        await setDoc(doc(db, 'karate_settings', 'schedules'), {
          groupClasses: updatedClasses
        });
        setGroupClasses(updatedClasses);

        // Delete old calendar events
        const eventsRef = collection(db, 'events');
        const q = query(
          eventsRef,
          where('type', '==', 'karate'),
          where('classId', '==', classId)
        );
        const snapshot = await getDocs(q);
        
        for (const doc of snapshot.docs) {
          await deleteDoc(doc.ref);
        }
      } else {
        // Add new class
        const newClassWithId = { ...classData, id: classId };
        const updatedClasses = [...groupClasses, newClassWithId];
        await setDoc(doc(db, 'karate_settings', 'schedules'), {
          groupClasses: updatedClasses
        });
        setGroupClasses(updatedClasses);
      }

      // Add recurring events to calendar
      const nextDate = getNextDayDate(classData.day);
      const nextDates = getNextFourWeeks(nextDate);

      for (const date of nextDates) {
        const [hours, minutes] = classData.time.split(':');
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        await addDoc(collection(db, 'events'), {
          title: `🥋 ${classData.name}`,
          date: date.toISOString().split('T')[0],
          startTime: classData.time,
          endDate: new Date(date.getTime() + classData.duration * 60000).toISOString(),
          duration: classData.duration,
          type: 'karate',
          participants: classData.participants,
          recurring: true,
          day: classData.day,
          classId: classId
        });
      }

      setEditingClass(null);
      setNewClass({
        name: '',
        day: 'Lundi',
        time: '17:00',
        duration: 60,
        participants: []
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error managing class:', error);
      alert('Erreur lors de la gestion du cours');
    }
  };

  const handleEditClass = (classInfo) => {
    setEditingClass(classInfo);
    setShowAddForm(true);
  };

  const handleRemoveClass = async (classInfo) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return;

    try {
      // Remove from group classes
      const updatedClasses = groupClasses.filter(c => c.id !== classInfo.id);
      await setDoc(doc(db, 'karate_settings', 'schedules'), {
        groupClasses: updatedClasses
      });
      setGroupClasses(updatedClasses);

      // Remove from calendar
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('type', '==', 'karate'),
        where('classId', '==', classInfo.id)
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

  const toggleParticipant = (userId) => {
    const target = editingClass || newClass;
    const setter = editingClass ? setEditingClass : setNewClass;
    
    setter(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
        <div className="meal-actions">
          <button 
            className="add-meal-button"
            onClick={() => setShowAddForm(true)}
          >
            ➕ Ajouter un cours
          </button>
          <button 
            className={`list-meal-button ${showClassList ? 'active' : ''}`}
            onClick={() => setShowClassList(!showClassList)}
          >
            📋 Liste des cours
          </button>
        </div>
      </div>

      {(showAddForm || showClassList) && (
        <Modal
          title={showAddForm ? (editingClass ? '✏️ Modifier un cours' : '➕ Ajouter un cours') : '📋 Liste des cours'}
          onClose={() => {
            setShowAddForm(false);
            setShowClassList(false);
            setEditingClass(null);
            setNewClass({
              name: '',
              day: 'Lundi',
              time: '17:00',
              duration: 60,
              participants: []
            });
          }}
        >
          {showAddForm ? (
            <div className="add-form">
              <input
                type="text"
                value={editingClass ? editingClass.name : newClass.name}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editingClass) {
                    setEditingClass(prev => ({ ...prev, name: value }));
                  } else {
                    setNewClass(prev => ({ ...prev, name: value }));
                  }
                }}
                placeholder="Nom du cours"
                className="class-name-input"
              />
              
              <div className="class-time-inputs">
                <select
                  value={editingClass ? editingClass.day : newClass.day}
                  onChange={(e) => {
                    if (editingClass) {
                      setEditingClass({ ...editingClass, day: e.target.value });
                    } else {
                      setNewClass({ ...newClass, day: e.target.value });
                    }
                  }}
                  className="day-select"
                >
                  {WEEKDAYS.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                
                <input
                  type="time"
                  value={editingClass ? editingClass.time : newClass.time}
                  onChange={(e) => {
                    if (editingClass) {
                      setEditingClass({ ...editingClass, time: e.target.value });
                    } else {
                      setNewClass({ ...newClass, time: e.target.value });
                    }
                  }}
                  className="time-input"
                />
                
                <input
                  type="number"
                  value={editingClass ? editingClass.duration : newClass.duration}
                  onChange={(e) => {
                    if (editingClass) {
                      setEditingClass({ ...editingClass, duration: parseInt(e.target.value) });
                    } else {
                      setNewClass({ ...newClass, duration: parseInt(e.target.value) });
                    }
                  }}
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
                    className={`participant-tag ${(editingClass || newClass).participants.includes(user.id) ? 'selected' : ''}`}
                    onClick={() => toggleParticipant(user.id)}
                  >
                    {user.avatar} {user.displayName}
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button onClick={handleAddClass} className="submit-button">
                  {editingClass ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingClass(null);
                    setNewClass({
                      name: '',
                      day: 'Lundi',
                      time: '17:00',
                      duration: 60,
                      participants: []
                    });
                  }}
                  className="cancel-button"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="meals-categories">
              <div className="meals-category">
                <h4>📅 Tous les cours</h4>
                {groupClasses.map((classInfo) => (
                  <div key={classInfo.id} className="meal-list-item">
                    <span className="meal-name">
                      {classInfo.name} - {classInfo.day} à {classInfo.time} ({classInfo.duration} min)
                    </span>
                    <div className="meal-actions">
                      <button
                        onClick={() => handleEditClass(classInfo)}
                        className="meal-action-button edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleRemoveClass(classInfo)}
                        className="meal-action-button delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}