import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './MealPlanner.css';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const jourEmoji = { 
  Lundi: '🌅', Mardi: '🌤️', Mercredi: '🌞', Jeudi: '🌈', 
  Vendredi: '🌙', Samedi: '⭐', Dimanche: '☀️' 
};

export default function MealPlanner() {
  const [meals, setMeals] = useState({});
  const [mealsList, setMealsList] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: '', types: [] });

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
        setMealsList(data.meals || []);
        setFavorites(data.favoris || []);
      }
    };
    fetchData();
  }, []);

  const persistData = async (newMeals, newFavorites) => {
    await setDoc(doc(db, 'repas', 'listes'), {
      meals: newMeals,
      favoris: newFavorites
    });
  };

  const handleAddMeal = async () => {
    if (!newMeal.name.trim() || newMeal.types.length === 0) return;
    
    const updatedMeals = [...mealsList, {
      name: newMeal.name.trim(),
      types: newMeal.types,
      isFavorite: false
    }];
    
    setMealsList(updatedMeals);
    await persistData(updatedMeals, favorites);
    setNewMeal({ name: '', types: [] });
    setShowMealDialog(false);
  };

  const toggleMealType = (type) => {
    setNewMeal(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const toggleFavorite = async (meal) => {
    const updatedMeals = mealsList.map(m => 
      m.name === meal.name ? { ...m, isFavorite: !m.isFavorite } : m
    );
    
    const newFavorites = updatedMeals
      .filter(m => m.isFavorite)
      .map(m => m.name);
    
    setMealsList(updatedMeals);
    setFavorites(newFavorites);
    await persistData(updatedMeals, newFavorites);
  };

  const updateMeal = async (jour, type, meal) => {
    const updated = { ...meals };
    const list = updated[jour][type.toLowerCase()];
    if (!list.includes(meal.name)) {
      list.push(meal.name);
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

  const handleDayClick = (jour, type) => {
    setSelectedDay(jour);
    setSelectedType(type);
  };

  return (
    <div className="meal-planner">
      <div className="meal-header">
        <button className="add-meal-button" onClick={() => setShowMealDialog(true)}>
          ➕ Ajouter un plat
        </button>
      </div>

      <div className="meal-content">
        <div className="meal-days">
          {jours.map((jour) => (
            <div key={jour} className="meal-day">
              <h3>{jourEmoji[jour]} {jour}</h3>
              
              <div className={`meal-slot ${selectedDay === jour && selectedType === 'lunch' ? 'selected' : ''}`}
                   onClick={() => handleDayClick(jour, 'lunch')}>
                <h4>🍱 Lunch</h4>
                {meals[jour]?.lunch.map((name) => (
                  <div key={name} className="meal-item">
                    <span>{name}</span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      removeMeal(jour, 'lunch', name);
                    }}>×</button>
                  </div>
                ))}
              </div>

              <div className={`meal-slot ${selectedDay === jour && selectedType === 'souper' ? 'selected' : ''}`}
                   onClick={() => handleDayClick(jour, 'souper')}>
                <h4>🍽️ Souper</h4>
                {meals[jour]?.souper.map((name) => (
                  <div key={name} className="meal-item">
                    <span>{name}</span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      removeMeal(jour, 'souper', name);
                    }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(selectedDay || showMealDialog) && (
          <div className="meal-selector">
            {showMealDialog ? (
              <div className="add-meal-form">
                <h3>Ajouter un nouveau plat</h3>
                <input
                  type="text"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du plat"
                />
                <div className="meal-types">
                  <label>
                    <input
                      type="checkbox"
                      checked={newMeal.types.includes('lunch')}
                      onChange={() => toggleMealType('lunch')}
                    />
                    🍱 Lunch
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={newMeal.types.includes('souper')}
                      onChange={() => toggleMealType('souper')}
                    />
                    🍽️ Souper
                  </label>
                </div>
                <div className="form-actions">
                  <button onClick={handleAddMeal} className="save-button">
                    Ajouter
                  </button>
                  <button onClick={() => setShowMealDialog(false)} className="cancel-button">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="meal-list">
                <h3>Choisir un plat pour {selectedDay} ({selectedType})</h3>
                {mealsList
                  .filter(meal => meal.types.includes(selectedType))
                  .map((meal) => (
                    <div key={meal.name} className="meal-option">
                      <button onClick={() => updateMeal(selectedDay, selectedType, meal)}>
                        {meal.name}
                      </button>
                      <button 
                        className={`favorite-button ${meal.isFavorite ? 'active' : ''}`}
                        onClick={() => toggleFavorite(meal)}
                      >
                        {meal.isFavorite ? '⭐' : '☆'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}