import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const SECTIONS = {
  'progression': { name: 'Progression', icon: '📈' },
  'cours': { name: 'Cours', icon: '📚' },
  'competitions': { name: 'Compétitions', icon: '🏆' }
};

export default function Karate({ user }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

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
            onClick={() => setSelectedSection(id)}
          >
            <div className="folder-icon">{section.icon}</div>
            <span className="folder-name">{section.name}</span>
          </div>
        ))}
      </div>

      {selectedSection && (
        <Modal
          title={`${SECTIONS[selectedSection].icon} ${SECTIONS[selectedSection].name}`}
          onClose={() => setSelectedSection(null)}
        >
          <div className="section-content">
            {/* Section content will be implemented based on selection */}
            <p>Contenu à venir pour {SECTIONS[selectedSection].name}</p>
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