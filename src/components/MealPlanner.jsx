import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './MealPlanner.css';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const jourEmoji = { 
  Lundi: '🌅', Mardi: '🌤️', Mercredi: '🌞', Jeudi: '🌈', 
  Vendredi: '🌙', Samedi: '⭐', Dimanche: '☀️' 
};

export default function MealPlanner() {
  const [meals, setMeals] = useState({});
  const [lunchList, setLunchList] = useState([]);
  const [souperList, setSouperList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [newMeal, setNewMeal] = useState('');
  const [newType, setNewType] = useState('Lunch');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const semaineRef = doc(db, 'repas', 'semaine');
      const listesRef = doc(db, 'repas', 'listes');

      const snap = await getDoc(semaineRef);
      if (snap.exists()) {
        const data = snap.data();
        const normalized = {};
        for (const j of jours) {
          normalized[j] = {
            lunch: Array.isArray(data[j]?.lunch) ? data[j].lunch : [],
            souper: Array.isArray(data[j]?.souper) ? data[j].souper : []
          };
        }
        setMeals(normalized);
      }

      const listSnap = await getDoc(listesRef);
      if (listSnap.exists()) {
        const data = listSnap.data();
        setLunchList(data.lunch || []);
        setSouperList(data.souper || []);
        setFavorites(data.favoris || []);
      }
    };
    fetchData();
  }, []);

  const persistLists = async (newLunch, newSouper, newFavorites) => {
    await setDoc(doc(db, 'repas', 'listes'), {
      lunch: newLunch,
      souper: newSouper,
      favoris: newFavorites
    });
  };

  const updateMeal = async (jour, type, name) => {
    const updated = { ...meals };
    const list = updated[jour][type.toLowerCase()];
    if (!list.includes(name)) {
      list.push(name);
      setMeals(updated);
      await setDoc(doc(db, 'repas', 'semaine'), updated);
    }
    setSelectedDay(null);
    setSelectedType(null);
  };

  const removeMeal = async (jour, type, name) => {
    const updated = { ...meals };
    updated[jour][type.toLowerCase()] = updated[jour][type.toLowerCase()].filter(m => m !== name);
    setMeals(updated);
    await setDoc(doc(db, 'repas', 'semaine'), updated);
  };

  const handleAddMeal = async () => {
    const trimmed = newMeal.trim();
    if (!trimmed) return;
    if (newType === 'Lunch' && !lunchList.includes(trimmed)) {
      const updated = [...lunchList, trimmed];
      setLunchList(updated);
      await persistLists(updated, souperList, favorites);
    }
    if (newType === 'Souper' && !souperList.includes(trimmed)) {
      const updated = [...souperList, trimmed];
      setSouperList(updated);
      await persistLists(lunchList, updated, favorites);
    }
    setNewMeal('');
  };

  const handleDayClick = (jour, type) => {
    setSelectedDay(jour);
    setSelectedType(type);
  };

  const handleMealSelect = (meal) => {
    if (selectedDay && selectedType) {
      updateMeal(selectedDay, selectedType, meal);
    }
  };

  const MealSelector = ({ type, meals }) => {
    return (
      <div className="meal-selector">
        <h4>{type === 'Lunch' ? '🍱 Lunchs' : '🍽️ Soupers'}</h4>
        <div className="meal-options">
          {meals.map((meal, i) => (
            <button
              key={i}
              className="meal-option"
              onClick={() => handleMealSelect(meal)}
            >
              {meal}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="meal-planner-full">
      <div className="meal-grid">
        {jours.map((jour) => (
          <div key={jour} className="meal-day-card">
            <h5>{jourEmoji[jour]} {jour}</h5>
            <div 
              className={`meal-slot ${selectedDay === jour && selectedType === 'Lunch' ? 'selected' : ''}`}
              onClick={() => handleDayClick(jour, 'Lunch')}
            >
              <strong>Lunch</strong>
              {meals[jour]?.lunch.map((meal, i) => (
                <div key={i} className="meal-item">
                  {meal}
                  <button className="remove-btn" onClick={(e) => {
                    e.stopPropagation();
                    removeMeal(jour, 'Lunch', meal);
                  }}>×</button>
                </div>
              ))}
              {meals[jour]?.lunch.length === 0 && (
                <div className="empty-slot">Ajouter un lunch</div>
              )}
            </div>
            
            <div 
              className={`meal-slot ${selectedDay === jour && selectedType === 'Souper' ? 'selected' : ''}`}
              onClick={() => handleDayClick(jour, 'Souper')}
            >
              <strong>Souper</strong>
              {meals[jour]?.souper.map((meal, i) => (
                <div key={i} className="meal-item">
                  {meal}
                  <button className="remove-btn" onClick={(e) => {
                    e.stopPropagation();
                    removeMeal(jour, 'Souper', meal);
                  }}>×</button>
                </div>
              ))}
              {meals[jour]?.souper.length === 0 && (
                <div className="empty-slot">Ajouter un souper</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="meal-sidebar">
        <div className="add-meal">
          <input
            value={newMeal}
            onChange={(e) => setNewMeal(e.target.value)}
            placeholder="Ajouter un plat"
            onKeyPress={(e) => e.key === 'Enter' && handleAddMeal()}
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="Lunch">Lunch</option>
            <option value="Souper">Souper</option>
          </select>
          <button onClick={handleAddMeal}>+</button>
        </div>

        {selectedDay && selectedType && (
          <MealSelector
            type={selectedType}
            meals={selectedType === 'Lunch' ? lunchList : souperList}
          />
        )}

        {favorites.length > 0 && (
          <div className="favorites-section">
            <h4>⭐ Favoris</h4>
            <div className="meal-options">
              {favorites.map((meal, i) => (
                <button
                  key={i}
                  className="meal-option favorite"
                  onClick={() => handleMealSelect(meal)}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}