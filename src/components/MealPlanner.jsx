import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './MealPlanner.css';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const jourAbbr = { Lundi: 'Lu', Mardi: 'Ma', Mercredi: 'Me', Jeudi: 'Je', Vendredi: 'Ve', Samedi: 'Sa', Dimanche: 'Di' };
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
  };

  const removeMeal = async (jour, type, name) => {
    const updated = { ...meals };
    updated[jour][type.toLowerCase()] = updated[jour][type.toLowerCase()].filter(m => m !== name);
    setMeals(updated);
    await setDoc(doc(db, 'repas', 'semaine'), updated);
  };

  const clearAllMeals = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider tous les repas de la semaine ?')) {
      const cleared = {};
      jours.forEach(j => cleared[j] = { lunch: [], souper: [] });
      setMeals(cleared);
      await setDoc(doc(db, 'repas', 'semaine'), cleared);
    }
  };

  const getUsedDays = (mealName) => {
    const used = [];
    for (const [j, dayMeals] of Object.entries(meals)) {
      const all = [...(dayMeals.lunch || []), ...(dayMeals.souper || [])];
      if (all.includes(mealName)) used.push(jourAbbr[j]);
    }
    return used;
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

  const removeFromList = async (name, listType) => {
    if (listType === 'Lunch') {
      const updated = lunchList.filter(m => m !== name);
      setLunchList(updated);
      await persistLists(updated, souperList, favorites);
    }
    if (listType === 'Souper') {
      const updated = souperList.filter(m => m !== name);
      setSouperList(updated);
      await persistLists(lunchList, updated, favorites);
    }
    if (listType === 'Favoris') {
      const updated = favorites.filter(m => m !== name);
      setFavorites(updated);
      await persistLists(lunchList, souperList, updated);
    }
  };

  const handleDropInFavorites = async (item) => {
    if (!favorites.includes(item.name)) {
      const updated = [...favorites, item.name];
      setFavorites(updated);
      await persistLists(lunchList, souperList, updated);
    }
  };

  const DraggableSuggestion = ({ name, type, listType }) => {
    const [{ isDragging }, dragRef] = useDrag({
      type: 'MEAL',
      item: { name, type },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    });

    const used = getUsedDays(name);

    return (
      <div
        ref={dragRef}
        className={`suggestion ${isDragging ? 'dragging' : ''}`}
      >
        <span>{name}</span>
        {used.length > 0 && <span className="used-days">({used.join(', ')})</span>}
      </div>
    );
  };

  const DropZone = ({ jour, type, meals, onDropMeal, onRemoveMeal }) => {
    const [{ isOver }, dropRef] = useDrop({
      accept: 'MEAL',
      drop: (item) => onDropMeal(jour, type, item.name),
      collect: (monitor) => ({ isOver: monitor.isOver() })
    });

    return (
      <div ref={dropRef} className={`drop-zone ${isOver ? 'hovered' : ''}`}>
        <strong>{type}</strong>
        {meals.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Glissez un repas ici
          </div>
        ) : (
          <ul className="meal-list">
            {meals.map((meal, i) => (
              <li key={i}>
                {meal}
                <button 
                  className="remove-btn"
                  onClick={() => onRemoveMeal(jour, type, meal)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const FavoritesDropZone = () => {
    const [{ isOver }, dropRef] = useDrop({
      accept: 'MEAL',
      drop: (item) => handleDropInFavorites(item),
      collect: (monitor) => ({ isOver: monitor.isOver() })
    });

    return (
      <div ref={dropRef} className={`favorites-zone ${isOver ? 'hovered' : ''}`}>
        <h4>⭐ Favoris</h4>
        {favorites.map((name, i) => (
          <DraggableSuggestion key={i} name={name} type={newType} listType="Favoris" />
        ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="meal-planner-full">
        <div className="meal-suggestions">
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

          <FavoritesDropZone />

          <h4>🍱 Lunchs</h4>
          {lunchList.map((name, i) => (
            <DraggableSuggestion key={i} name={name} type="Lunch" listType="Lunch" />
          ))}

          <h4>🍽️ Soupers</h4>
          {souperList.map((name, i) => (
            <DraggableSuggestion key={i} name={name} type="Souper" listType="Souper" />
          ))}

          <button className="clear-btn" onClick={clearAllMeals}>
            🗑️ Vider la semaine
          </button>
        </div>

        <div className="meal-grid">
          {jours.map((jour) => (
            <div key={jour} className="meal-day-card">
              <h5>{jourEmoji[jour]} {jour}</h5>
              <DropZone
                jour={jour}
                type="Lunch"
                meals={meals[jour]?.lunch || []}
                onDropMeal={updateMeal}
                onRemoveMeal={removeMeal}
              />
              <DropZone
                jour={jour}
                type="Souper"
                meals={meals[jour]?.souper || []}
                onDropMeal={updateMeal}
                onRemoveMeal={removeMeal}
              />
            </div>
          ))}
        </div>
      </div>
    </DndProvider>
  );
}