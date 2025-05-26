import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', textColor: '#000000' },
  'yellow': { name: 'Jaune', color: '#ffd700', textColor: '#000000' },
  'orange': { name: 'Orange', color: '#ffa500', textColor: '#000000' },
  'green': { name: 'Verte', color: '#228b22', textColor: '#ffffff' },
  'blue': { name: 'Bleue', color: '#0000ff', textColor: '#ffffff' },
  'brown': { name: 'Brune', color: '#8b4513', textColor: '#ffffff' },
  'black': { name: 'Noire', color: '#000000', textColor: '#ffffff' },
  'yellow-orange': { 
    name: 'Jaune-Orange', 
    colors: ['#ffd700', '#ffa500'],
    textColor: '#000000'
  },
  'orange-green': { 
    name: 'Orange-Verte', 
    colors: ['#ffa500', '#228b22'],
    textColor: '#000000'
  },
  'green-blue': { 
    name: 'Verte-Bleue', 
    colors: ['#228b22', '#0000ff'],
    textColor: '#ffffff'
  },
  'blue-brown': { 
    name: 'Bleue-Brune', 
    colors: ['#0000ff', '#8b4513'],
    textColor: '#ffffff'
  }
};

export default function Karate({ user }) {
  const [activeTab, setActiveTab] = useState('progression');
  const [karateUsers, setKarateUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingBeltDate, setEditingBeltDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadKarateData();
  }, []);

  const loadKarateData = async () => {
    try {
      const usersSnap = await getDocs(query(
        collection(db, 'users'), 
        where('practicesKarate', '==', true)
      ));
      
      const usersData = [];
      for (const userDoc of usersSnap.docs) {
        const karateData = await getDoc(doc(db, 'karate_users', userDoc.id));
        if (karateData.exists()) {
          usersData.push({
            id: userDoc.id,
            ...userDoc.data(),
            ...karateData.data()
          });
        }
      }
      
      setKarateUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading karate data:', error);
      setLoading(false);
    }
  };

  const handleBeltDateChange = async (userId, beltColor, date) => {
    try {
      const userRef = doc(db, 'karate_users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const beltHistory = userDoc.data().beltHistory || [];
        const updatedHistory = beltHistory.map(entry => 
          entry.belt === beltColor ? { ...entry, date } : entry
        );
        
        await updateDoc(userRef, { beltHistory: updatedHistory });
        await loadKarateData();
      }
      
      setEditingBeltDate(null);
    } catch (error) {
      console.error('Error updating belt date:', error);
    }
  };

  const renderBelt = (belt, date) => {
    const beltData = BELT_COLORS[belt];
    if (!beltData) return null;

    const style = beltData.colors ? {
      background: `linear-gradient(to bottom, ${beltData.colors[0]} 50%, ${beltData.colors[1]} 50%)`,
      color: beltData.textColor
    } : {
      background: beltData.color,
      color: beltData.textColor
    };

    return (
      <div className="belt-entry" style={style}>
        <span className="belt-name">{beltData.name}</span>
        {date && (
          editingBeltDate === `${belt}-${date}` ? (
            <div className="date-editor">
              <input
                type="date"
                defaultValue={date}
                onChange={(e) => handleBeltDateChange(selectedUser.id, belt, e.target.value)}
              />
              <button onClick={() => setEditingBeltDate(null)}>✓</button>
            </div>
          ) : (
            <span 
              className="belt-date"
              onClick={() => setEditingBeltDate(`${belt}-${date}`)}
            >
              {new Date(date).toLocaleDateString()}
            </span>
          )
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <div className="header-content">
          <h2>🥋 Karaté</h2>
          <div className="section-buttons">
            <button 
              className={`section-button ${activeTab === 'progression' ? 'active' : ''}`}
              onClick={() => setActiveTab('progression')}
            >
              📈 Progression
            </button>
            <button 
              className={`section-button ${activeTab === 'cours' ? 'active' : ''}`}
              onClick={() => setActiveTab('cours')}
            >
              📚 Cours
            </button>
            <button 
              className={`section-button ${activeTab === 'competitions' ? 'active' : ''}`}
              onClick={() => setActiveTab('competitions')}
            >
              🏆 Compétitions
            </button>
            <button 
              className="section-button settings"
              onClick={() => setShowSettings(true)}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'progression' && (
        <div className="users-grid">
          {karateUsers.map(karateUser => (
            <div 
              key={karateUser.id} 
              className="user-karate-card"
              onClick={() => setSelectedUser(karateUser)}
            >
              <div className="belt-info">
                {renderBelt(karateUser.currentBelt)}
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
                    <span>{karateUser.displayName}</span>
                    <span>{karateUser.attendedClasses} / {karateUser.requiredClasses} cours</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
              {selectedUser.beltHistory
                ?.filter(entry => entry.date)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((entry, index) => renderBelt(entry.belt, entry.date))
              }
            </div>

            <div className="next-belts">
              <h3>Prochaines ceintures</h3>
              {selectedUser.beltHistory
                ?.filter(entry => !entry.date)
                .map((entry, index) => renderBelt(entry.belt))
              }
            </div>
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal
          title="⚙️ Paramètres Karaté"
          onClose={() => setShowSettings(false)}
        >
          <div className="karate-settings">
            <h3>Configuration des cours et passages de grades</h3>
            {/* Settings content will go here */}
          </div>
        </Modal>
      )}
    </div>
  );
}