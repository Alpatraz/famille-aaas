import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, query, where, orderBy } from 'firebase/firestore';
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
  const [weeklyTheme, setWeeklyTheme] = useState('');
  const [competitions, setCompetitions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddCompetition, setShowAddCompetition] = useState(false);

  useEffect(() => {
    loadUsers();
    loadWeeklyTheme();
    loadCompetitions();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadKarateData(selectedUser.id);
      loadSessions(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    const userData = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setUsers(userData);
    
    // If current user is a child, auto-select them
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
      // Initialize new user data
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

  const loadWeeklyTheme = async () => {
    const themeRef = doc(db, 'karate_theme', 'current');
    const snap = await getDoc(themeRef);
    if (snap.exists()) {
      setWeeklyTheme(snap.data().theme);
    }
  };

  const loadCompetitions = async () => {
    const snap = await getDocs(
      query(collection(db, 'karate_competitions'), orderBy('date', 'desc'))
    );
    setCompetitions(snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };

  const loadSessions = async (userId) => {
    const snap = await getDocs(
      query(
        collection(db, 'karate_sessions'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      )
    );
    setSessions(snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  };

  const handleAddSession = async (sessionData) => {
    try {
      await addDoc(collection(db, 'karate_sessions'), {
        userId: selectedUser.id,
        ...sessionData,
        date: new Date().toISOString()
      });
      
      // Update attendance count
      const userRef = doc(db, 'karate_users', selectedUser.id);
      await setDoc(userRef, {
        ...karateData,
        attendance: (karateData.attendance || 0) + 1
      }, { merge: true });
      
      loadSessions(selectedUser.id);
      loadKarateData(selectedUser.id);
      setShowAddSession(false);
    } catch (error) {
      console.error('Error adding session:', error);
    }
  };

  const handleAddCompetition = async (competitionData) => {
    try {
      await addDoc(collection(db, 'karate_competitions'), {
        ...competitionData,
        participants: [],
        results: {}
      });
      loadCompetitions();
      setShowAddCompetition(false);
    } catch (error) {
      console.error('Error adding competition:', error);
    }
  };

  const calculateNextBelt = () => {
    if (!karateData) return null;
    
    const currentBelt = karateData.belt;
    const attendance = karateData.attendance || 0;
    const required = REQUIRED_SESSIONS[currentBelt];
    
    if (!required) return null; // Already black belt
    
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

      {weeklyTheme && (
        <div className="theme-banner">
          <h3>📝 Thème de la semaine</h3>
          <p>{weeklyTheme}</p>
        </div>
      )}

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

          <div className="training-section">
            <div className="section-header">
              <h3>📊 Entraînements</h3>
              {user?.role === 'parent' && (
                <button onClick={() => setShowAddSession(true)}>
                  ➕ Ajouter
                </button>
              )}
            </div>
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-type">
                    {session.type === 'regular' ? '🔄 Cours régulier' : '👤 Cours privé'}
                  </div>
                  <div className="session-date">
                    {new Date(session.date).toLocaleDateString()}
                  </div>
                  {session.type === 'private' && (
                    <div className="session-price">
                      💰 {session.price}€
                      <span className={`payment-status ${session.paid ? 'paid' : 'unpaid'}`}>
                        {session.paid ? '✓ Payé' : '⏳ En attente'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="competitions-section">
            <div className="section-header">
              <h3>🏆 Compétitions</h3>
              {user?.role === 'parent' && (
                <button onClick={() => setShowAddCompetition(true)}>
                  ➕ Ajouter
                </button>
              )}
            </div>
            <div className="competitions-list">
              {competitions.map(competition => (
                <div key={competition.id} className="competition-card">
                  <h4>{competition.name}</h4>
                  <div className="competition-details">
                    <span>📅 {new Date(competition.date).toLocaleDateString()}</span>
                    <span>📍 {competition.location}</span>
                  </div>
                  {competition.results[selectedUser.id] && (
                    <div className="competition-results">
                      {Object.entries(competition.results[selectedUser.id]).map(([category, result]) => (
                        <div key={category} className="result-item">
                          <span>{category}:</span>
                          <span className="medal">{result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}