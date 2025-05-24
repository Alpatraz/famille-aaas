import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from './Modal';
import './Karate.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
  technique: 'Technique',
  assiduite: 'Assiduité',
  comprehension: 'Compréhension',
  esprit: 'Esprit karaté'
};

export default function Karate({ user }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [users, setUsers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [weeklyTheme, setWeeklyTheme] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Charger les utilisateurs
      const usersSnap = await getDocs(collection(db, 'karate_users'));
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      // Charger les entraînements
      const trainingsSnap = await getDocs(collection(db, 'karate_trainings'));
      const trainingsData = trainingsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrainings(trainingsData);

      // Charger les compétitions
      const competitionsSnap = await getDocs(collection(db, 'karate_competitions'));
      const competitionsData = competitionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompetitions(competitionsData);

      // Charger le thème de la semaine
      const themeDoc = await getDoc(doc(db, 'karate_settings', 'weeklyTheme'));
      if (themeDoc.exists()) {
        setWeeklyTheme(themeDoc.data().theme);
      }
    } catch (error) {
      console.error('Error loading karate data:', error);
    }
  };

  const calculateProgress = (userData) => {
    if (!userData?.requiredClasses) return 0;
    return Math.min(100, (userData.attendedClasses / userData.requiredClasses) * 100);
  };

  const renderProgressionContent = () => (
    <div className="progression-section">
      <div className="users-grid">
        {users.map(userData => (
          <div key={userData.id} className="user-karate-card">
            <div className="belt-info">
              <div className="current-belt" style={{
                backgroundColor: BELT_COLORS[userData.currentBelt]?.color,
                border: userData.currentBelt === 'white' ? '1px solid #ddd' : 'none'
              }}>
                <span>{userData.name} - {BELT_COLORS[userData.currentBelt]?.name}</span>
              </div>
              
              <div className="belt-dates">
                {userData.beltHistory?.map(history => (
                  <div key={history.belt} className="belt-date">
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
                  {userData.attendedClasses} / {userData.requiredClasses} cours
                </div>
              </div>

              <div className="kata-categories">
                {Object.entries(KATA_CATEGORIES).map(([key, name]) => (
                  <div key={key} className="kata-category">
                    <h4>{name}</h4>
                    <div className="kata-list">
                      {userData.katas?.[key]?.map(kata => (
                        <div key={kata.name} className="kata-item">
                          {kata.name} - {kata.level}/5
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );

  const renderTrainingsContent = () => (
    <div className="trainings-section">
      <div className="training-calendar">
        <h3>Cours réguliers</h3>
        <div className="regular-classes">
          <div className="class-item">
            <span>Lundi 18h30 - 20h00</span>
            <span>Cours général</span>
          </div>
          <div className="class-item">
            <span>Jeudi 18h30 - 20h00</span>
            <span>Cours technique</span>
          </div>
        </div>

        <h3>Cours privés</h3>
        <div className="private-classes">
          {trainings
            .filter(t => t.type === 'private')
            .map(training => (
              <div key={training.id} className="private-class">
                <div className="class-info">
                  <span>{new Date(training.date).toLocaleDateString()}</span>
                  <span>{training.time}</span>
                  <span>{training.instructor}</span>
                </div>
                <div className="class-status">
                  <span className={`payment-status ${training.paid ? 'paid' : 'unpaid'}`}>
                    {training.paid ? 'Payé' : 'Non payé'}
                  </span>
                  <span className="price">{training.price}€</span>
                </div>
              </div>
            ))}
        </div>

        <div className="attendance-chart">
          <Bar
            data={{
              labels: users.map(u => u.name),
              datasets: [{
                label: 'Présences',
                data: users.map(u => u.attendedClasses),
                backgroundColor: '#4CAF50'
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Suivi des présences' }
              }
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderCompetitionsContent = () => (
    <div className="competitions-section">
      <div className="competitions-list">
        <h3>Compétitions à venir</h3>
        {competitions
          .filter(c => new Date(c.date) > new Date())
          .map(competition => (
            <div key={competition.id} className="competition-card">
              <div className="competition-header">
                <h4>{competition.name}</h4>
                <span className="competition-date">
                  {new Date(competition.date).toLocaleDateString()}
                </span>
              </div>
              <div className="competition-details">
                <p>📍 {competition.location}</p>
                <p>🏆 Catégories: {competition.categories.join(', ')}</p>
                <div className="participants">
                  <h5>Participants:</h5>
                  {competition.participants?.map(p => (
                    <div key={p.name} className="participant">
                      <span>{p.name}</span>
                      <span>{p.categories.join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

        <h3>Résultats passés</h3>
        {competitions
          .filter(c => new Date(c.date) <= new Date() && c.results)
          .map(competition => (
            <div key={competition.id} className="competition-card past">
              <div className="competition-header">
                <h4>{competition.name}</h4>
                <span className="competition-date">
                  {new Date(competition.date).toLocaleDateString()}
                </span>
              </div>
              <div className="competition-results">
                {competition.results.map((result, i) => (
                  <div key={i} className="result-item">
                    <span>{result.participant}</span>
                    <span>{result.category}</span>
                    <span className="medal">{result.position}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );

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
          <button 
            className="section-button"
            onClick={() => setSelectedSection('trainings')}
          >
            🎯 Entraînements
          </button>
          <button 
            className="section-button"
            onClick={() => setSelectedSection('competitions')}
          >
            🏆 Compétitions
          </button>
        </div>
      </div>

      {selectedSection === 'progression' && (
        <Modal
          title="📊 Progression"
          onClose={() => setSelectedSection(null)}
        >
          {renderProgressionContent()}
        </Modal>
      )}

      {selectedSection === 'trainings' && (
        <Modal
          title="🎯 Entraînements"
          onClose={() => setSelectedSection(null)}
        >
          {renderTrainingsContent()}
        </Modal>
      )}

      {selectedSection === 'competitions' && (
        <Modal
          title="🏆 Compétitions"
          onClose={() => setSelectedSection(null)}
        >
          {renderCompetitionsContent()}
        </Modal>
      )}
    </div>
  );
}