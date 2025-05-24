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

export default function Karate({ user }) {
  const [karateData, setKarateData] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');

  useEffect(() => {
    if (user) {
      loadKarateData();
      loadTrainings();
      loadCompetitions();
      loadWeeklyTheme();
    }
  }, [user]);

  const loadKarateData = async () => {
    if (!user) return;

    const userRef = doc(db, 'karate_users', user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      setKarateData(snap.data());
    } else {
      const initialData = {
        belt: 'white',
        lastPromotion: null,
        katas: [],
        attendance: 0,
        nextExamDate: null
      };
      await setDoc(userRef, initialData);
      setKarateData(initialData);
    }
  };

  const loadTrainings = async () => {
    if (!user) return;

    const snap = await getDocs(collection(db, 'karate_sessions'));
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setTrainings(data);
  };

  const loadCompetitions = async () => {
    if (!user) return;

    const snap = await getDocs(collection(db, 'karate_competitions'));
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCompetitions(data);
  };

  const loadWeeklyTheme = async () => {
    const themeRef = doc(db, 'karate_theme', 'current');
    const snap = await getDoc(themeRef);
    if (snap.exists()) {
      setWeeklyTheme(snap.data().theme);
    }
  };

  const calculateProgress = () => {
    if (!karateData) return 0;
    
    const required = REQUIRED_SESSIONS[karateData.belt];
    if (!required) return 100; // Ceinture noire
    
    return Math.min(100, (karateData.attendance / required) * 100);
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

  return (
    <div className="karate-container">
      <div className="karate-header">
        <h2>🥋 Karaté</h2>
      </div>

      {karateData && (
        <div className="karate-content">
          <div className="belt-section">
            <div className="current-belt" style={{
              backgroundColor: BELT_COLORS[karateData.belt].color,
              border: karateData.belt === 'white' ? '1px solid #ddd' : 'none'
            }}>
              <span>Ceinture {BELT_COLORS[karateData.belt].name}</span>
            </div>

            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${calculateProgress()}%`,
                    backgroundColor: BELT_COLORS[karateData.belt].color,
                    borderColor: karateData.belt === 'white' ? '#ddd' : 'transparent'
                  }}
                />
              </div>
              <div className="progress-text">
                {karateData.attendance} / {REQUIRED_SESSIONS[karateData.belt] || '∞'} cours
              </div>
            </div>

            {calculateNextBelt() && (
              <div className="next-belt-info">
                <p>
                  Plus que {calculateNextBelt().remaining} cours avant la ceinture{' '}
                  {BELT_COLORS[calculateNextBelt().next].name}
                </p>
              </div>
            )}
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
      )}
    </div>
  );
}