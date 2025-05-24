import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
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

const REQUIRED_SESSIONS = {
  white: 20,
  yellow: 30,
  orange: 40,
  green: 50,
  blue: 60,
  brown: 70
};

export default function Karate({ user }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [karateData, setKarateData] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadKarateData(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    const userData = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(userData);
    
    // Si l'utilisateur est un enfant, le sélectionner automatiquement
    if (user?.role === 'enfant') {
      const currentUser = userData.find(u => u.id === user.uid);
      if (currentUser) {
        setSelectedUser(currentUser);
      }
    }
  };

  const loadKarateData = async (userId) => {
    const userRef = doc(db, 'karate_users', userId);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      setKarateData(snap.data());
    } else {
      // Initialiser les données pour un nouvel utilisateur
      const initialData = {
        belt: 'white',
        lastPromotion: null,
        katas: [],
        attendance: 0
      };
      await setDoc(userRef, initialData);
      setKarateData(initialData);
    }
  };

  const calculateNextBelt = () => {
    if (!karateData) return null;
    
    const currentBelt = karateData.belt;
    const attendance = karateData.attendance || 0;
    const required = REQUIRED_SESSIONS[currentBelt];
    
    if (!required) return null; // Déjà ceinture noire
    
    return {
      next: Object.keys(BELT_COLORS)[BELT_COLORS[currentBelt].order + 1],
      remaining: Math.max(0, required - attendance)
    };
  };

  const renderProgressBar = () => {
    if (!karateData) return null;
    
    const nextBelt = calculateNextBelt();
    if (!nextBelt) return null;
    
    const required = REQUIRED_SESSIONS[karateData.belt];
    const progress = Math.min(100, (karateData.attendance / required) * 100);
    
    return (
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${progress}%`,
              backgroundColor: BELT_COLORS[karateData.belt].color,
              borderColor: karateData.belt === 'white' ? '#ddd' : 'transparent'
            }}
          />
        </div>
        <div className="progress-text">
          {karateData.attendance} / {required} cours
        </div>
      </div>
    );
  };

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
        {user?.role === 'parent' && (
          <select 
            value={selectedUser?.id || ''} 
            onChange={(e) => {
              const selected = users.find(u => u.id === e.target.value);
              setSelectedUser(selected);
            }}
          >
            <option value="">Sélectionner un membre</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.avatar} {u.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedUser && karateData && (
        <div className="karate-content">
          <div className="belt-section">
            <div className="current-belt" style={{
              backgroundColor: BELT_COLORS[karateData.belt].color,
              border: karateData.belt === 'white' ? '1px solid #ddd' : 'none'
            }}>
              <span>Ceinture {BELT_COLORS[karateData.belt].name}</span>
            </div>
            {renderProgressBar()}
            {calculateNextBelt() && (
              <div className="next-belt-info">
                <p>
                  Plus que {calculateNextBelt().remaining} cours avant la ceinture{' '}
                  {BELT_COLORS[calculateNextBelt().next].name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}