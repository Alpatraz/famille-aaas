import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  white: { name: 'Blanche', color: '#ffffff', order: 0 },
  yellow: { name: 'Jaune', color: '#ffd700', order: 1 },
  orange: { name: 'Orange', color: '#ffa500', order: 2 },
  green: { name: 'Verte', color: '#228b22', order: 3 },
  blue: { name: 'Bleue', color: '#0000ff', order: 4 },
  brown: { name: 'Marron', color: '#8b4513', order: 5 },
  black: { name: 'Noire', color: '#000000', order: 6 }
};

const KATA_CATEGORIES = {
  technique: { name: 'Technique', icon: '🥋' },
  assiduite: { name: 'Assiduité', icon: '⏰' },
  comprehension: { name: 'Compréhension', icon: '🧠' },
  esprit: { name: 'Esprit karaté', icon: '🌟' }
};

export default function Karate({ user }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [karateUsers, setKarateUsers] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');
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

      const themeDoc = await getDoc(doc(db, 'karate_settings', 'weeklyTheme'));
      if (themeDoc.exists()) {
        setWeeklyTheme(themeDoc.data().theme);
      }
    } catch (error) {
      console.error('Error loading karate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (userData) => {
    if (!userData?.requiredClasses) return 0;
    return Math.min(100, (userData.attendedClasses / userData.requiredClasses) * 100);
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
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating karate profile:', error);
      alert('Erreur lors de la sauvegarde du profil');
    }
  };

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
                value={user.currentBelt}
                onChange={(e) => handleSaveProfile(user, { ...user, currentBelt: e.target.value })}
              >
                {Object.entries(BELT_COLORS).map(([value, { name }]) => (
                  <option key={value} value={value}>{name}</option>
                ))}
              </select>
            </div>

            <div className="training-section">
              <label>Cours suivis</label>
              <input
                type="number"
                value={user.attendedClasses || 0}
                onChange={(e) => handleSaveProfile(user, { 
                  ...user, 
                  attendedClasses: parseInt(e.target.value) || 0 
                })}
                min="0"
              />

              <label>Cours requis pour la prochaine ceinture</label>
              <input
                type="number"
                value={user.requiredClasses || 20}
                onChange={(e) => handleSaveProfile(user, { 
                  ...user, 
                  requiredClasses: parseInt(e.target.value) || 20 
                })}
                min="1"
              />
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
            </div>

            <div className="kata-section">
              <h4>Kata</h4>
              {Object.entries(KATA_CATEGORIES).map(([key, category]) => (
                <div key={key} className="kata-category-edit">
                  <h5>{category.icon} {category.name}</h5>
                  <div className="kata-list-edit">
                    {(user.katas?.[key] || []).map((kata, index) => (
                      <div key={index} className="kata-item-edit">
                        <input
                          type="text"
                          value={kata.name}
                          onChange={(e) => {
                            const updatedKatas = { ...user.katas };
                            updatedKatas[key][index].name = e.target.value;
                            handleSaveProfile(user, { ...user, katas: updatedKatas });
                          }}
                        />
                        <select
                          value={kata.level}
                          onChange={(e) => {
                            const updatedKatas = { ...user.katas };
                            updatedKatas[key][index].level = parseInt(e.target.value);
                            handleSaveProfile(user, { ...user, katas: updatedKatas });
                          }}
                        >
                          {[1, 2, 3, 4, 5].map(level => (
                            <option key={level} value={level}>Niveau {level}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const updatedKatas = { ...user.katas };
                            updatedKatas[key].splice(index, 1);
                            handleSaveProfile(user, { ...user, katas: updatedKatas });
                          }}
                          className="delete-kata"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const updatedKatas = { ...user.katas };
                        if (!updatedKatas[key]) updatedKatas[key] = [];
                        updatedKatas[key].push({ name: '', level: 1 });
                        handleSaveProfile(user, { ...user, katas: updatedKatas });
                      }}
                      className="add-kata"
                    >
                      + Ajouter un kata
                    </button>
                  </div>
                </div>
              ))}
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
              color: userData.currentBelt === 'white' ? '#1e293b' : '#ffffff'
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

            <div className="kata-categories">
              {Object.entries(KATA_CATEGORIES).map(([key, category]) => (
                <div key={key} className="kata-category">
                  <h4>{category.icon} {category.name}</h4>
                  <div className="kata-list">
                    {userData.katas?.[key]?.map((kata, index) => (
                      <div key={index} className="kata-item">
                        {kata.name} - Niveau {kata.level}/5
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
          title={selectedSection === 'progression' ? '📊 Progression Karaté' : '⚙️ Paramètres Karaté'}
          onClose={() => setSelectedSection(null)}
        >
          {selectedSection === 'progression' ? renderProgressionContent() : renderProfileSettings()}
        </Modal>
      )}
    </div>
  );
}