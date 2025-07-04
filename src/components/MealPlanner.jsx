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
  const [showMealList, setShowMealList] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: '', types: [] });
  const [editingMeal, setEditingMeal] = useState(null);

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

  const handleEditMeal = async (meal) => {
    if (!editingMeal || !editingMeal.name.trim()) return;
    
    const updatedMeals = mealsList.map(m => 
      m.name === meal.name ? {
        ...m,
        name: editingMeal.name.trim(),
        types: editingMeal.types
      } : m
    );
    
    // Mettre à jour les repas planifiés
    const updatedWeek = { ...meals };
    Object.keys(updatedWeek).forEach(jour => {
      updatedWeek[jour].lunch = updatedWeek[jour].lunch.map(m => 
        m === meal.name ? editingMeal.name : m
      );
      updatedWeek[jour].souper = updatedWeek[jour].souper.map(m => 
        m === meal.name ? editingMeal.name : m
      );
    });
    
    setMealsList(updatedMeals);
    setMeals(updatedWeek);
    await persistData(updatedMeals, favorites);
    await setDoc(doc(db, 'repas', 'semaine'), updatedWeek);
    setEditingMeal(null);
  };

  const toggleMealType = (type) => {
    const target = editingMeal || newMeal;
    const setter = editingMeal ? setEditingMeal : setNewMeal;
    
    setter(prev => ({
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

  const deleteMeal = async (mealToDelete) => {
    if (window.confirm(`Supprimer le plat "${mealToDelete.name}" ?`)) {
      const updatedMeals = mealsList.filter(m => m.name !== mealToDelete.name);
      const newFavorites = favorites.filter(f => f !== mealToDelete.name);
      
      setMealsList(updatedMeals);
      setFavorites(newFavorites);
      await persistData(updatedMeals, newFavorites);

      // Supprimer le plat de tous les jours où il est utilisé
      const updated = { ...meals };
      Object.keys(updated).forEach(jour => {
        updated[jour].lunch = updated[jour].lunch.filter(m => m !== mealToDelete.name);
        updated[jour].souper = updated[jour].souper.filter(m => m !== mealToDelete.name);
      });
      setMeals(updated);
      await setDoc(doc(db, 'repas', 'semaine'), updated);
    }
  };

  const resetWeek = async () => {
    const emptyWeek = {};
    jours.forEach(jour => {
      emptyWeek[jour] = { lunch: [], souper: [] };
    });

    const confirmModal = document.createElement('div');
    confirmModal.className = 'reset-confirm-modal';
    confirmModal.innerHTML = `
      <div class="reset-confirm-content">
        <h3>⚠️ Réinitialiser la semaine</h3>
        <p>Êtes-vous sûr de vouloir effacer tous les repas de la semaine ?</p>
        <div class="reset-confirm-buttons">
          <button class="reset-confirm-yes">Oui, réinitialiser</button>
          <button class="reset-confirm-no">Non, annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);

    const handleConfirm = async () => {
      setMeals(emptyWeek);
      await setDoc(doc(db, 'repas', 'semaine'), emptyWeek);
      confirmModal.remove();
    };

    const handleCancel = () => {
      confirmModal.remove();
    };

    confirmModal.querySelector('.reset-confirm-yes').addEventListener('click', handleConfirm);
    confirmModal.querySelector('.reset-confirm-no').addEventListener('click', handleCancel);
  };

  return (
    <div className="meal-planner">
      <div className="meal-header">
        <h2>🍽️ Planification des repas</h2>
        <div className="meal-actions">
          <button className="add-meal-button" onClick={() => setShowMealDialog(true)}>
            ➕ Ajouter un plat
          </button>
          <button 
            className={`list-meal-button ${showMealList ? 'active' : ''}`}
            onClick={() => setShowMealList(!showMealList)}
          >
            📋 Liste des plats
          </button>
          <button className="reset-week-button" onClick={resetWeek}>
            🔄 Réinitialiser la semaine
          </button>
        </div>
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

        {(selectedDay || showMealDialog || showMealList) && (
          <div className="meal-selector">
            <div className="meal-selector-header">
              {showMealDialog ? (
                <>
                  <h3>{editingMeal ? 'Modifier un plat' : 'Ajouter un nouveau plat'}</h3>
                  <button className="close-selector" onClick={() => {
                    setShowMealDialog(false);
                    setEditingMeal(null);
                  }}>×</button>
                </>
              ) : showMealList ? (
                <>
                  <h3>Liste des plats</h3>
                  <button className="close-selector" onClick={() => setShowMealList(false)}>×</button>
                </>
              ) : (
                <>
                  <h3>Choisir un plat pour {selectedDay} ({selectedType})</h3>
                  <button className="close-selector" onClick={() => {
                    setSelectedDay(null);
                    setSelectedType(null);
                  }}>×</button>
                </>
              )}
            </div>

            {showMealDialog ? (
              <div className="add-meal-form">
                <input
                  type="text"
                  value={editingMeal ? editingMeal.name : newMeal.name}
                  onChange={(e) => editingMeal 
                    ? setEditingMeal(prev => ({ ...prev, name: e.target.value }))
                    : setNewMeal(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nom du plat"
                />
                <div className="meal-types">
                  <label>
                    <input
                      type="checkbox"
                      checked={(editingMeal || newMeal).types.includes('lunch')}
                      onChange={() => toggleMealType('lunch')}
                    />
                    <span className="meal-tag lunch">🍱 Lunch</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={(editingMeal || newMeal).types.includes('souper')}
                      onChange={() => toggleMealType('souper')}
                    />
                    <span className="meal-tag dinner">🍽️ Souper</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button 
                    onClick={editingMeal ? () => handleEditMeal(editingMeal) : handleAddMeal} 
                    className="save-button"
                  >
                    {editingMeal ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowMealDialog(false);
                      setEditingMeal(null);
                    }} 
                    className="cancel-button"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : showMealList ? (
              <div className="meals-categories">
                <div className="meals-category">
                  <h4>⭐ Favoris</h4>
                  {mealsList
                    .filter(m => m.isFavorite)
                    .map((meal) => (
                      <div key={meal.name} className="meal-list-item">
                        <span className="meal-name">{meal.name}</span>
                        <div className="meal-tags">
                          {meal.types.includes('lunch') && <span className="meal-tag lunch">Lunch</span>}
                          {meal.types.includes('souper') && <span className="meal-tag dinner">Souper</span>}
                        </div>
                        <div className="meal-actions">
                          <button 
                            onClick={() => {
                              setEditingMeal(meal);
                              setShowMealDialog(true);
                            }} 
                            className="meal-action-button edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => toggleFavorite(meal)} 
                            className="meal-action-button favorite"
                          >
                            ⭐
                          </button>
                          <button 
                            onClick={() => deleteMeal(meal)} 
                            className="meal-action-button delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="meals-category">
                  <h4>📋 Tous les plats</h4>
                  {mealsList
                    .filter(m => !m.isFavorite)
                    .map((meal) => (
                      <div key={meal.name} className="meal-list-item">
                        <span className="meal-name">{meal.name}</span>
                        <div className="meal-tags">
                          {meal.types.includes('lunch') && <span className="meal-tag lunch">Lunch</span>}
                          {meal.types.includes('souper') && <span className="meal-tag dinner">Souper</span>}
                        </div>
                        <div className="meal-actions">
                          <button 
                            onClick={() => {
                              setEditingMeal(meal);
                              setShowMealDialog(true);
                            }} 
                            className="meal-action-button edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => toggleFavorite(meal)} 
                            className="meal-action-button favorite"
                          >
                            ☆
                          </button>
                          <button 
                            onClick={() => deleteMeal(meal)} 
                            className="meal-action-button delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="meal-list">
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