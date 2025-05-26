import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', order: 0 },
  'yellow': { name: 'Jaune', color: '#ffd700', order: 1 },
  'orange': { name: 'Orange', color: '#ffa500', order: 2 },
  'green': { name: 'Verte', color: '#228b22', order: 3 },
  'blue': { name: 'Bleue', color: '#0000ff', order: 4 },
  'brown': { name: 'Brune', color: '#8b4513', order: 5 },
  'black': { name: 'Noire', color: '#000000', order: 6 }
};

export default function Karate({ user }) {
  const [karateUsers, setKarateUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadKarateUsers();
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

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
      </div>

      <div className="users-grid">
        {karateUsers.map(karateUser => (
          <div 
            key={karateUser.id} 
            className="user-karate-card"
            onClick={() => setSelectedUser(karateUser)}
          >
            <div className="belt-info">
              <div 
                className="current-belt"
                style={{
                  background: BELT_COLORS[karateUser.currentBelt]?.color || '#fff',
                  color: karateUser.currentBelt === 'white' ? '#000' : '#fff'
                }}
              >
                {karateUser.name} - {BELT_COLORS[karateUser.currentBelt]?.name}
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

      {selectedUser && (
        <Modal
          title={`🥋 Progression de ${selectedUser.name}`}
          onClose={() => setSelectedUser(null)}
        >
          <div className="user-progression">
            <div className="belt-history">
              <h3>Historique des ceintures</h3>
              {selectedUser.beltHistory?.map((entry, index) => (
                <div 
                  key={index}
                  className={`belt-entry ${entry.belt === selectedUser.currentBelt ? 'current' : ''}`}
                  style={{
                    background: BELT_COLORS[entry.belt]?.color || '#fff',
                    color: entry.belt === 'white' ? '#000' : '#fff'
                  }}
                >
                  <span className="belt-name">
                    {BELT_COLORS[entry.belt]?.name}
                  </span>
                  <span className="belt-date">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="courses-summary">
              <div className="courses-counts">
                <div className="course-stat">
                  <span className="stat-label">Cours privés</span>
                  <span className="stat-value">{selectedUser.privateLessons || 0}</span>
                </div>
                <div className="course-stat">
                  <span className="stat-label">Cours de groupe</span>
                  <span className="stat-value">{selectedUser.groupLessons || 0}</span>
                </div>
              </div>

              <div className="next-belt-progress">
                <div className="progress-label">
                  <span>Progression vers la prochaine ceinture</span>
                  <span>{selectedUser.attendedClasses} / {selectedUser.requiredClasses}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(selectedUser.attendedClasses / selectedUser.requiredClasses) * 100}%` 
                    }}
                  />
                </div>
                <div className="remaining-classes">
                  {selectedUser.requiredClasses - selectedUser.attendedClasses} cours restants
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}