import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
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

const INITIAL_USERS = {
  'Alexandre': { belt: 'yellow', attendance: 15 },
  'Anne': { belt: 'orange', attendance: 25 },
  'Antoine': { belt: 'white', attendance: 10 },
  'Guillaume': { belt: 'brown', attendance: 65 }
};

export default function Karate({ user }) {
  const [karateData, setKarateData] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    initializeKarateData();
    if (user) {
      loadKarateData();
      loadTrainings();
      loadCompetitions();
      loadWeeklyTheme();
      loadAllUsers();
    }
  }, [user]);

  const initializeKarateData = async () => {
    try {
      // Initialiser les données pour chaque utilisateur
      for (const [name, data] of Object.entries(INITIAL_USERS)) {
        const userRef = doc(db, 'karate_users', name);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            name,
            belt: data.belt,
            attendance: data.attendance,
            lastPromotion: new Date().toISOString(),
            katas: [],
            nextExamDate: null
          });
        }
      }

      // Ajouter quelques entraînements
      const trainingsRef = collection(db, 'karate_sessions');
      const trainingsSnap = await getDocs(trainingsRef);
      
      if (trainingsSnap.empty) {
        const trainings = [
          { date: '2024-01-15', type: 'Kata', attended: true },
          { date: '2024-01-17', type: 'Combat', attended: true },
          { date: '2024-01-22', type: 'Technique', attended: false }
        ];

        for (const training of trainings) {
          await addDoc(trainingsRef, training);
        }
      }

      // Ajouter quelques compétitions
      const competitionsRef = collection(db, 'karate_competitions');
      const competitionsSnap = await getDocs(competitionsRef);
      
      if (competitionsSnap.empty) {
        const competitions = [
          { date: '2024-02-10', name: 'Championnat régional', result: 'Médaille d\'or' },
          { date: '2024-03-15', name: 'Coupe de France', result: null },
          { date: '2024-04-20', name: 'Open international', result: null }
        ];

        for (const competition of competitions) {
          await addDoc(competitionsRef, competition);
        }
      }

      // Définir le thème de la semaine
      const themeRef = doc(db, 'karate_theme', 'current');
      const themeDoc = await getDoc(themeRef);
      
      if (!themeDoc.exists()) {
        await setDoc(themeRef, {
          theme: 'Perfectionnement des katas Heian',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error initializing karate data:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'karate_users'));
      const users = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadKarateData = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'karate_users', user.displayName);
      const snap = await getDoc(userRef);
      
      if (snap.exists()) {
        setKarateData(snap.data());
      }
    } catch (error) {
      console.error('Error loading karate data:', error);
    }
  };

  const loadTrainings = async () => {
    try {
      const snap = await getDocs(collection(db, 'karate_sessions'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  };

  const loadCompetitions = async () => {
    try {
      const snap = await getDocs(collection(db, 'karate_competitions'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompetitions(data);
    } catch (error) {
      console.error('Error loading competitions:', error);
    }
  };

  const loadWeeklyTheme = async () => {
    try {
      const themeRef = doc(db, 'karate_theme', 'current');
      const snap = await getDoc(themeRef);
      if (snap.exists()) {
        setWeeklyTheme(snap.data().theme);
      }
    } catch (error) {
      console.error('Error loading weekly theme:', error);
    }
  };

  const calculateProgress = (userData) => {
    if (!userData) return 0;
    
    const required = REQUIRED_SESSIONS[userData.belt];
    if (!required) return 100; // Ceinture noire
    
    return Math.min(100, (userData.attendance / required) * 100);
  };

  const calculateNextBelt = (userData) => {
    if (!userData) return null;
    
    const currentBelt = userData.belt;
    const attendance = userData.attendance || 0;
    const required = REQUIRED_SESSIONS[currentBelt];
    
    if (!required) return null; // Déjà ceinture noire
    
    return {
      next: Object.keys(BELT_COLORS)[BELT_COLORS[currentBelt].order + 1],
      remaining: Math.max(0, required - attendance)
    };
  };

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
      </div>

      <div className="karate-content">
        <div className="users-grid">
          {allUsers.map(userData => (
            <div key={userData.id} className="user-karate-card">
              <div className="belt-section">
                <div className="current-belt" style={{
                  backgroundColor: BELT_COLORS[userData.belt].color,
                  border: userData.belt === 'white' ? '1px solid #ddd' : 'none'
                }}>
                  <span>{userData.name} - Ceinture {BELT_COLORS[userData.belt].name}</span>
                </div>

                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${calculateProgress(userData)}%`,
                        backgroundColor: BELT_COLORS[userData.belt].color,
                        borderColor: userData.belt === 'white' ? '#ddd' : 'transparent'
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    {userData.attendance} / {REQUIRED_SESSIONS[userData.belt] || '∞'} cours
                  </div>
                </div>

                {calculateNextBelt(userData) && (
                  <div className="next-belt-info">
                    <p>
                      Plus que {calculateNextBelt(userData).remaining} cours avant la ceinture{' '}
                      {BELT_COLORS[calculateNextBelt(userData).next].name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {weeklyTheme && (
          <div className="theme-section">
            <h3>📝 Thème de la semaine</h3>
            <p>{weeklyTheme}</p>
          </div>
        )}

        <div className="training-section">
          <h3>🎯 Entraînements</h3>
          <div className="training-list">
            {trainings.map(training => (
              <div key={training.id} className="training-item">
                <span>{training.date}</span>
                <span>{training.type}</span>
                <span>{training.attended ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="competition-section">
          <h3>🏆 Compétitions</h3>
          <div className="competition-list">
            {competitions.map(competition => (
              <div key={competition.id} className="competition-item">
                <span>{competition.date}</span>
                <span>{competition.name}</span>
                <span>{competition.result || 'À venir'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}