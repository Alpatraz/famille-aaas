import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
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
        </div>
      </div>

      {selectedSection === 'progression' && (
        <Modal
          title="📊 Progression Karaté"
          onClose={() => setSelectedSection(null)}
        >
          {renderProgressionContent()}
        </Modal>
      )}
    </div>
  );
}