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
  'black': { name: 'Noire', color: '#000000', order: 14 }
};

const SECTIONS = {
  progression: { name: 'Progression', icon: '📈' },
  cours: { name: 'Cours', icon: '📚' },
  competition: { name: 'Compétition', icon: '🏆' }
};

export default function Karate({ user }) {
  const [activeSection, setActiveSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [karateUsers, setKarateUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

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

      {activeSection && (
        <Modal
          title={`${SECTIONS[activeSection].icon} ${SECTIONS[activeSection].name}`}
          onClose={() => setActiveSection(null)}
        >
          {activeSection === 'progression' && (
            <div className="progression-section">
              {karateUsers.map(user => (
                <div key={user.id} className="user-karate-card">
                  <div className="belt-info">
                    <div 
                      className="current-belt"
                      style={{ 
                        backgroundColor: BELT_COLORS[user.currentBelt]?.color || '#fff',
                        color: ['white', 'white-yellow'].includes(user.currentBelt) ? '#000' : '#fff'
                      }}
                    >
                      {user.avatar} {user.displayName} - Ceinture {BELT_COLORS[user.currentBelt]?.name}
                    </div>
                    <div className="progress-section">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(user.attendedClasses / user.requiredClasses) * 100}%`
                          }}
                        />
                      </div>
                      <div className="progress-text">
                        <span>{user.attendedClasses} cours effectués</span>
                        <span className="remaining-classes">
                          {Math.max(0, user.requiredClasses - user.attendedClasses)} cours restants
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'cours' && (
            <div className="courses-section">
              <h3>Liste des cours à venir</h3>
              <p>Fonctionnalité en développement</p>
            </div>
          )}

          {activeSection === 'competition' && (
            <div className="competition-section">
              <h3>Compétitions</h3>
              <p>Fonctionnalité en développement</p>
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
                              date: new Date().toISOString()
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
    </div>
  );
}