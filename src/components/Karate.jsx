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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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

      {showPrivateLessons && renderPrivateLessonsModal()}
    </div>
  );
}