import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, setDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', order: 0 },
  'white-yellow': { 
    name: 'Blanche / Jaune', 
    topColor: '#ffffff',
    bottomColor: '#ffd700',
    order: 1 
  },
  'yellow': { name: 'Jaune', color: '#ffd700', order: 2 },
  'yellow-orange': { 
    name: 'Jaune / Orange',
    topColor: '#ffd700',
    bottomColor: '#ffa500',
    order: 3 
  },
  'orange': { name: 'Orange', color: '#ffa500', order: 4 },
  'orange-purple': { 
    name: 'Orange / Mauve',
    topColor: '#ffa500',
    bottomColor: '#800080',
    order: 5 
  },
  'purple': { name: 'Mauve', color: '#800080', order: 6 },
  'purple-green': { 
    name: 'Mauve / Verte',
    topColor: '#800080',
    bottomColor: '#228b22',
    order: 7 
  },
  'green': { name: 'Verte', color: '#228b22', order: 8 },
  'green-blue': { 
    name: 'Verte / Bleue',
    topColor: '#228b22',
    bottomColor: '#0000ff',
    order: 9 
  },
  'blue': { name: 'Bleue', color: '#0000ff', order: 10 },
  'blue-brown': { 
    name: 'Bleue / Brune',
    topColor: '#0000ff',
    bottomColor: '#8b4513',
    order: 11 
  },
  'brown': { name: 'Brune', color: '#8b4513', order: 12 },
  'brown-black': { 
    name: 'Brune / Noire',
    topColor: '#8b4513',
    bottomColor: '#000000',
    order: 13 
  },
  'black': { name: 'Noire', color: '#000000', order: 14 }
};

const SECTIONS = {
  progression: { name: 'Progression', icon: '📈' },
  cours: { name: 'Cours', icon: '📚' },
  competition: { name: 'Compétition', icon: '🏆' }
};

const COURSE_TYPES = {
  'regular': { name: 'Cours de groupe régulier', icon: '🥋' },
  'weapons': { name: 'Cours d\'armes', icon: '⚔️' },
  'combat': { name: 'Cours de combat', icon: '🥊' },
  'competition': { name: 'Cours de compétition', icon: '🏆' }
};

const DAYS = [
  { id: 'monday', name: 'Lundi' },
  { id: 'tuesday', name: 'Mardi' },
  { id: 'wednesday', name: 'Mercredi' },
  { id: 'thursday', name: 'Jeudi' },
  { id: 'friday', name: 'Vendredi' },
  { id: 'saturday', name: 'Samedi' },
  { id: 'sunday', name: 'Dimanche' }
];

const RECURRENCE = [
  { id: 'weekly', name: 'Hebdomadaire' },
  { id: 'biweekly', name: 'Bihebdomadaire' }
];

export default function Karate({ user }) {
  const [activeSection, setActiveSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [karateUsers, setKarateUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingBeltDate, setEditingBeltDate] = useState(null);
  const [showPrivateLessons, setShowPrivateLessons] = useState(false);
  const [privateLessonForm, setPrivateLessonForm] = useState({
    day: '',
    time: '',
    recurrence: 'weekly',
    nextDate: new Date().toISOString().split('T')[0]
  });
  const [coursesData, setCoursesData] = useState({});
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    type: 'regular',
    day: '',
    time: '',
    duration: 60,
    recurrence: 'weekly',
    participants: []
  });
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('practicesKarate', '==', true))
      );
      
      const users = [];
      const coursesInfo = {};
      
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const karateData = await getDoc(doc(db, 'karate_users', userDoc.id));
        const karateInfo = karateData.data() || {};
        
        const privateCount = karateInfo.privateLessons?.enabled ? 
          (karateInfo.privateLessons.attendedClasses || 0) : 0;
        const groupCount = karateInfo.groupClasses?.attended || 0;
        const requiredForNextBelt = karateInfo.requiredClasses || 20;
        const remainingClasses = Math.max(0, requiredForNextBelt - (privateCount + groupCount));
        
        coursesInfo[userDoc.id] = {
          privateCount,
          groupCount,
          totalCount: privateCount + groupCount,
          remainingClasses,
          requiredForNextBelt
        };
        
        users.push({
          id: userDoc.id,
          displayName: userData.displayName,
          avatar: userData.avatar,
          ...karateData.data()
        });
      }
      
      setKarateUsers(users);
      setCoursesData(coursesInfo);

      const coursesSnap = await getDocs(collection(db, 'karate_courses'));
      const coursesData = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading karate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (userId, settings) => {
    try {
      await setDoc(doc(db, 'karate_users', userId), {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await loadData();
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving karate settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const handleSaveBeltDate = async (userId, beltColor, date) => {
    try {
      const userRef = doc(db, 'karate_users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      const updatedBeltHistory = [...(userData.beltHistory || [])];
      const existingIndex = updatedBeltHistory.findIndex(b => b.belt === beltColor);

      if (existingIndex !== -1) {
        updatedBeltHistory[existingIndex].date = date;
      } else {
        updatedBeltHistory.push({ belt: beltColor, date });
      }

      await updateDoc(userRef, {
        beltHistory: updatedBeltHistory
      });

      await loadData();
      setEditingBeltDate(null);
    } catch (error) {
      console.error('Error saving belt date:', error);
      alert('Erreur lors de la sauvegarde de la date');
    }
  };

  const handleSavePrivateLesson = async (userId) => {
    try {
      const userRef = doc(db, 'karate_users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() || {};

      const nextDates = [];
      let currentDate = new Date(privateLessonForm.nextDate);
      const increment = privateLessonForm.recurrence === 'weekly' ? 7 : 14;

      for (let i = 0; i < 12; i++) {
        nextDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + increment);
      }

      await updateDoc(userRef, {
        privateLessons: {
          ...userData.privateLessons,
          enabled: true,
          schedule: {
            day: privateLessonForm.day,
            time: privateLessonForm.time,
            recurrence: privateLessonForm.recurrence,
            nextDates
          }
        }
      });

      await loadData();
      setShowPrivateLessons(false);
    } catch (error) {
      console.error('Error saving private lesson:', error);
      alert('Erreur lors de la sauvegarde du cours privé');
    }
  };

  const handleSaveCourse = async () => {
    try {
      if (!courseForm.name || !courseForm.day || !courseForm.time || courseForm.participants.length === 0) {
        alert('Veuillez remplir tous les champs requis');
        return;
      }

      const courseData = {
        ...courseForm,
        createdAt: new Date().toISOString()
      };

      const courseRef = doc(collection(db, 'karate_courses'));
      await setDoc(courseRef, courseData);

      await loadData();
      setShowCourseModal(false);
      setCourseForm({
        name: '',
        type: 'regular',
        day: '',
        time: '',
        duration: 60,
        recurrence: 'weekly',
        participants: []
      });
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Erreur lors de la sauvegarde du cours');
    }
  };

  const renderBeltStyle = (beltId) => {
    const belt = BELT_COLORS[beltId];
    if (belt.topColor && belt.bottomColor) {
      return {
        '--top-color': belt.topColor,
        '--bottom-color': belt.bottomColor
      };
    }
    return {
      backgroundColor: belt.color,
      color: ['white', 'white-yellow'].includes(beltId) ? '#000' : '#fff'
    };
  };

  const renderUserProgression = (user) => {
    const sortedBelts = Object.entries(BELT_COLORS)
      .sort(([,a], [,b]) => a.order - b.order);

    const currentBeltOrder = BELT_COLORS[user.currentBelt]?.order || 0;
    
    return (
      <div className="user-progression">
        <div className="belt-history">
          <h3>Historique des ceintures</h3>
          {sortedBelts.map(([beltId, belt]) => {
            const beltHistory = user.beltHistory?.find(h => h.belt === beltId);
            const isPast = belt.order < currentBeltOrder;
            const isCurrent = beltId === user.currentBelt;
            const isSplitBelt = belt.topColor && belt.bottomColor;

            if (isPast || isCurrent) {
              return (
                <div 
                  key={beltId} 
                  className={`belt-entry ${isCurrent ? 'current' : ''} ${isSplitBelt ? 'split' : ''}`}
                  style={renderBeltStyle(beltId)}
                >
                  <span className="belt-name">{belt.name}</span>
                  {editingBeltDate === beltId ? (
                    <div className="date-editor">
                      <input
                        type="date"
                        defaultValue={beltHistory?.date || ''}
                        onChange={(e) => handleSaveBeltDate(user.id, beltId, e.target.value)}
                      />
                      <button onClick={() => setEditingBeltDate(null)}>✓</button>
                    </div>
                  ) : (
                    <div className="belt-date" onClick={() => setEditingBeltDate(beltId)}>
                      {beltHistory?.date ? new Date(beltHistory.date).toLocaleDateString() : '+ Ajouter date'}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="next-belts">
          <h3>Prochaines ceintures</h3>
          {sortedBelts
            .filter(([beltId, belt]) => belt.order > currentBeltOrder)
            .map(([beltId, belt]) => {
              const isSplitBelt = belt.topColor && belt.bottomColor;
              return (
                <div 
                  key={beltId}
                  className={`next-belt ${isSplitBelt ? 'split' : ''}`}
                  style={renderBeltStyle(beltId)}
                >
                  {belt.name}
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  const renderPrivateLessonsModal = () => (
    <Modal
      title="🥋 Cours privés"
      onClose={() => setShowPrivateLessons(false)}
    >
      <div className="private-lessons-form">
        <div className="form-group">
          <label>Jour de la semaine</label>
          <select
            value={privateLessonForm.day}
            onChange={(e) => setPrivateLessonForm(prev => ({
              ...prev,
              day: e.target.value
            }))}
          >
            <option value="">Sélectionner un jour</option>
            {DAYS.map(day => (
              <option key={day.id} value={day.id}>
                {day.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Heure du cours</label>
          <input
            type="time"
            value={privateLessonForm.time}
            onChange={(e) => setPrivateLessonForm(prev => ({
              ...prev,
              time: e.target.value
            }))}
          />
        </div>

        <div className="form-group">
          <label>Récurrence</label>
          <select
            value={privateLessonForm.recurrence}
            onChange={(e) => setPrivateLessonForm(prev => ({
              ...prev,
              recurrence: e.target.value
            }))}
          >
            {RECURRENCE.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date du prochain cours</label>
          <input
            type="date"
            value={privateLessonForm.nextDate}
            onChange={(e) => setPrivateLessonForm(prev => ({
              ...prev,
              nextDate: e.target.value
            }))}
          />
        </div>

        <div className="form-actions">
          <button 
            className="save-button"
            onClick={() => handleSavePrivateLesson(selectedUser?.id)}
            disabled={!privateLessonForm.day || !privateLessonForm.time}
          >
            Enregistrer
          </button>
          <button 
            className="cancel-button"
            onClick={() => setShowPrivateLessons(false)}
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderCourseModal = () => (
    <Modal
      title="🥋 Ajouter un cours"
      onClose={() => setShowCourseModal(false)}
    >
      <div className="course-form">
        <div className="form-group">
          <label>Nom du cours</label>
          <input
            type="text"
            value={courseForm.name}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              name: e.target.value
            }))}
            placeholder="Ex: Cours débutants"
          />
        </div>

        <div className="form-group">
          <label>Type de cours</label>
          <select
            value={courseForm.type}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              type: e.target.value
            }))}
          >
            {Object.entries(COURSE_TYPES).map(([key, { name }]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Jour</label>
          <select
            value={courseForm.day}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              day: e.target.value
            }))}
          >
            <option value="">Sélectionner un jour</option>
            {DAYS.map(day => (
              <option key={day.id} value={day.id}>
                {day.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Heure</label>
          <input
            type="time"
            value={courseForm.time}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              time: e.target.value
            }))}
          />
        </div>

        <div className="form-group">
          <label>Durée (minutes)</label>
          <input
            type="number"
            value={courseForm.duration}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              duration: parseInt(e.target.value)
            }))}
            min="30"
            step="15"
          />
        </div>

        <div className="form-group">
          <label>Récurrence</label>
          <select
            value={courseForm.recurrence}
            onChange={(e) => setCourseForm(prev => ({
              ...prev,
              recurrence: e.target.value
            }))}
          >
            {RECURRENCE.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Participants</label>
          <div className="participants-grid">
            {karateUsers.map(user => (
              <div
                key={user.id}
                className={`participant-card ${courseForm.participants.includes(user.id) ? 'selected' : ''}`}
                onClick={() => {
                  setCourseForm(prev => ({
                    ...prev,
                    participants: prev.participants.includes(user.id)
                      ? prev.participants.filter(id => id !== user.id)
                      : [...prev.participants, user.id]
                  }));
                }}
              >
                <span className="participant-avatar">{user.avatar}</span>
                <span className="participant-name">{user.displayName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button 
            className="save-button"
            onClick={handleSaveCourse}
          >
            Enregistrer
          </button>
          <button 
            className="cancel-button"
            onClick={() => setShowCourseModal(false)}
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );

  const renderUserCard = (user) => (
    <div className="user-karate-card">
      <div className="belt-info">
        <div 
          className={`current-belt ${BELT_COLORS[user.currentBelt]?.topColor ? 'split' : ''}`}
          style={renderBeltStyle(user.currentBelt)}
        >
          {user.avatar} {user.displayName}
          <div className="belt-name">
            Ceinture {BELT_COLORS[user.currentBelt]?.name}
          </div>
        </div>
        
        <div className="courses-summary">
          <div className="courses-counts">
            <div className="course-stat">
              <span className="stat-label">Cours privés</span>
              <span className="stat-value">{coursesData[user.id]?.privateCount || 0}</span>
            </div>
            <div className="course-stat">
              <span className="stat-label">Cours de groupe</span>
              <span className="stat-value">{coursesData[user.id]?.groupCount || 0}</span>
            </div>
          </div>
          
          <div className="next-belt-progress">
            <div className="progress-label">
              <span>Progrès vers la prochaine ceinture</span>
              <span>{coursesData[user.id]?.totalCount || 0} / {coursesData[user.id]?.requiredForNextBelt || 20}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{
                  width: `${Math.min(100, ((coursesData[user.id]?.totalCount || 0) / (coursesData[user.id]?.requiredForNextBelt || 20)) * 100)}%`
                }}
              />
            </div>
            <div className="remaining-classes">
              {coursesData[user.id]?.remainingClasses || 0} cours restants
            </div>
          </div>
        </div>

        {user.privateLessons?.enabled && (
          <div className="private-lessons-info">
            <p>Cours privés : {DAYS.find(d => d.id === user.privateLessons.schedule.day)?.name} à {user.privateLessons.schedule.time}</p>
            <p>Récurrence : {RECURRENCE.find(r => r.id === user.privateLessons.schedule.recurrence)?.name}</p>
            <p>Prochain cours : {new Date(user.privateLessons.schedule.nextDates[0]).toLocaleDateString()}</p>
          </div>
        )}
        <button 
          className="private-lessons-button"
          onClick={() => {
            setSelectedUser(user);
            setShowPrivateLessons(true);
          }}
        >
          📅 Gérer les cours privés
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <div className="header-content">
          <h2>🥋 Karaté</h2>
          <button 
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="sections-grid">
        {Object.entries(SECTIONS).map(([id, section]) => (
          <div
            key={id}
            className="section-folder"
            onClick={() => setActiveSection(id)}
          >
            <div className="folder-icon">{section.icon}</div>
            <span className="folder-name">{section.name}</span>
          </div>
        ))}
      </div>

      {activeSection === 'progression' && (
        <Modal
          title={`${SECTIONS[activeSection].icon} ${SECTIONS[activeSection].name}`}
          onClose={() => {
            setActiveSection(null);
            setSelectedUser(null);
          }}
        >
          {!selectedUser ? (
            <div className="users-grid">
              {karateUsers.map(user => renderUserCard(user))}
            </div>
          ) : (
            <div className="user-details">
              <button 
                className="back-button"
                onClick={() => setSelectedUser(null)}
              >
                ← Retour
              </button>
              {renderUserProgression(selectedUser)}
            </div>
          )}
        </Modal>
      )}

      {activeSection === 'cours' && (
        <Modal
          title={`${SECTIONS[activeSection].icon} ${SECTIONS[activeSection].name}`}
          onClose={() => setActiveSection(null)}
        >
          <div className="courses-section">
            <button 
              className="add-course-button"
              onClick={() => setShowCourseModal(true)}
            >
              ➕ Ajouter un cours
            </button>

            <div className="courses-grid">
              {courses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-header">
                    <h3>
                      {COURSE_TYPES[course.type].icon} {course.name}
                    </h3>
                    <span className="course-type">
                      {COURSE_TYPES[course.type].name}
                    </span>
                  </div>

                  <div className="course-details">
                    <p className="course-schedule">
                      {DAYS.find(d => d.id === course.day)?.name} à {course.time}
                      <br />
                      Durée: {course.duration} minutes
                    </p>
                    <p className="course-recurrence">
                      {RECURRENCE.find(r => r.id === course.recurrence)?.name}
                    </p>
                  </div>

                  <div className="course-participants">
                    <h4>Participants</h4>
                    <div className="participants-list">
                      {course.participants.map(participantId => {
                        const participant = karateUsers.find(u => u.id === participantId);
                        return participant ? (
                          <div key={participantId} className="participant-tag">
                            {participant.avatar} {participant.displayName}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal
          title="⚙️ Paramètres Karaté"
          onClose={() => {
            setShowSettings(false);
            setEditingUser(null);
          }}
        >
          <div className="karate-profile-settings">
            <div className="profile-grid">
              {karateUsers.map(user => (
                <div key={user.id} className="profile-card">
                  <div className="profile-header">
                    <div className="profile-avatar">{user.avatar}</div>
                    <h3>{user.displayName}</h3>
                  </div>

                  <div className="belt-section">
                    <label>Ceinture actuelle</label>
                    <select
                      value={editingUser?.id === user.id ? editingUser.currentBelt : user.currentBelt}
                      onChange={(e) => {
                        const newBelt = e.target.value;
                        setEditingUser(prev => ({
                          ...(prev || user),
                          id: user.id,
                          currentBelt: newBelt,
                          beltHistory: [
                            ...(user.beltHistory || []),
                            {
                              belt: newBelt,
                              date: new Date().toISOString().split('T')[0]
                            }
                          ]
                        }));
                      }}
                    >
                      {Object.entries(BELT_COLORS).map(([value, { name }]) => (
                        <option key={value} value={value}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="competition-section">
                    <label>Compétition</label>
                    <div className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingUser?.id === user.id ? editingUser.competition : user.competition}
                        onChange={(e) => {
                          setEditingUser(prev => ({
                            ...(prev || user),
                            id: user.id,
                            competition: e.target.checked
                          }));
                        }}
                      />
                      Participe aux compétitions
                    </div>
                  </div>

                  <div className="private-lessons-section">
                    <label>Cours privés</label>
                    <div className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingUser?.id === user.id ? editingUser.privateLessons : user.privateLessons}
                        onChange={(e) => {
                          setEditingUser(prev => ({
                            ...(prev || user),
                            id: user.id,
                            privateLessons: e.target.checked
                          }));
                        }}
                      />
                      Prend des cours privés
                    </div>
                  </div>

                  {editingUser?.id === user.id ? (
                    <div className="button-group">
                      <button
                        onClick={() => handleSaveSettings(user.id, editingUser)}
                        className="save-button"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="cancel-button"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUser(user)}
                      className="edit-button"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showCourseModal && renderCourseModal()}
      {showPrivateLessons && renderPrivateLessonsModal()}
    </div>
  );
}