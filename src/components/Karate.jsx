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
    loadKarateUsers();
    loadCourses();
  }, []);

  const loadKarateUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'karate_users'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setKarateUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading karate users:', error);
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const snap = await getDocs(collection(db, 'karate_courses'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleCourseFormChange = (field, value) => {
    setCourseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivateLessonFormChange = (field, value) => {
    setPrivateLessonForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCourse = async () => {
    try {
      const courseData = {
        ...courseForm,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'karate_courses'), courseData);
      setCourses(prev => [...prev, { id: docRef.id, ...courseData }]);
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
      console.error('Error adding course:', error);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await deleteDoc(doc(db, 'karate_courses', courseId));
      setCourses(prev => prev.filter(course => course.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleAddPrivateLesson = async () => {
    if (!selectedUser || !privateLessonForm.day || !privateLessonForm.time) return;

    try {
      const lessonData = {
        ...privateLessonForm,
        userId: selectedUser.id,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'private_lessons'), lessonData);
      setShowPrivateLessons(false);
      setPrivateLessonForm({
        day: '',
        time: '',
        recurrence: 'weekly',
        nextDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding private lesson:', error);
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
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
          title="📈 Progression"
          onClose={() => setActiveSection(null)}
        >
          <div className="users-grid">
            {karateUsers.map(karateUser => (
              <div key={karateUser.id} className="user-karate-card">
                <div className="belt-info">
                  <div 
                    className="current-belt"
                    style={{
                      background: BELT_COLORS[karateUser.currentBelt]?.color || '#fff',
                      color: karateUser.currentBelt === 'white' ? '#000' : '#fff'
                    }}
                  >
                    {BELT_COLORS[karateUser.currentBelt]?.name}
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
        </Modal>
      )}

      {activeSection === 'cours' && (
        <Modal
          title="📚 Cours"
          onClose={() => setActiveSection(null)}
        >
          <div className="course-management">
            <button 
              className="add-button"
              onClick={() => setShowCourseModal(true)}
            >
              ➕ Ajouter un cours
            </button>

            <div className="items-grid">
              {courses.map(course => (
                <div key={course.id} className="class-card">
                  <div className="class-header">
                    <h4>{course.name}</h4>
                    <div className="class-time">
                      {DAYS.find(d => d.id === course.day)?.name} à {course.time}
                    </div>
                  </div>
                  <div className="participants-list">
                    {course.participants.map(userId => {
                      const user = karateUsers.find(u => u.id === userId);
                      return user ? (
                        <span key={userId} className="participant-tag">
                          {user.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteCourse(course.id)}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showCourseModal && (
        <Modal
          title="➕ Ajouter un cours"
          onClose={() => setShowCourseModal(false)}
        >
          <div className="add-form">
            <input
              type="text"
              className="class-name-input"
              placeholder="Nom du cours"
              value={courseForm.name}
              onChange={e => handleCourseFormChange('name', e.target.value)}
            />

            <div className="class-time-inputs">
              <select
                className="day-select"
                value={courseForm.day}
                onChange={e => handleCourseFormChange('day', e.target.value)}
              >
                <option value="">Jour</option>
                {DAYS.map(day => (
                  <option key={day.id} value={day.id}>
                    {day.name}
                  </option>
                ))}
              </select>

              <input
                type="time"
                className="time-input"
                value={courseForm.time}
                onChange={e => handleCourseFormChange('time', e.target.value)}
              />

              <input
                type="number"
                className="duration-input"
                placeholder="Durée (min)"
                value={courseForm.duration}
                onChange={e => handleCourseFormChange('duration', parseInt(e.target.value))}
                min="30"
                step="15"
              />
            </div>

            <select
              value={courseForm.type}
              onChange={e => handleCourseFormChange('type', e.target.value)}
            >
              {Object.entries(COURSE_TYPES).map(([id, type]) => (
                <option key={id} value={id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>

            <div className="participant-selector">
              {karateUsers.map(user => (
                <div
                  key={user.id}
                  className={`participant-tag ${
                    courseForm.participants.includes(user.id) ? 'selected' : ''
                  }`}
                  onClick={() => {
                    const newParticipants = courseForm.participants.includes(user.id)
                      ? courseForm.participants.filter(id => id !== user.id)
                      : [...courseForm.participants, user.id];
                    handleCourseFormChange('participants', newParticipants);
                  }}
                >
                  {user.name}
                </div>
              ))}
            </div>

            <button onClick={handleAddCourse} className="add-button">
              Ajouter le cours
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}