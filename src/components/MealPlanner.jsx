// MealPlanner.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './MealPlanner.css';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const jourAbbr = { Lundi: 'Lu', Mardi: 'Ma', Mercredi: 'Me', Jeudi: 'Je', Vendredi: 'Ve', Samedi: 'Sa', Dimanche: 'Di' };

const suggestionsLunch = [
  'Wrap au poulet', 'Salade de pâtes', 'Riz sauté', 'Croque-monsieur', 'Soupe aux légumes'
];

const suggestionsSouper = [
  'Spaghetti bolognaise', 'Poulet rôti', 'Tacos', 'Poisson grillé', 'Pizza maison'
];

const DraggableSuggestion = ({ name, type, getUsedDays }) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'MEAL',
    item: { name, type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const used = getUsedDays(name);

  return (
    <div ref={dragRef} className={`suggestion ${isDragging ? 'dragging' : ''}`}>
      {name} {used.length > 0 && <span className="used-days">({used.join(', ')})</span>}
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
      <strong>{type} :</strong>
      {meals.length === 0 ? ' —' : (
        <ul className="meal-list">
          {meals.map((meal, i) => (
            <li key={i}>
              {meal} <button className="remove-btn" onClick={() => onRemoveMeal(jour, type, meal)}>❌</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function MealPlanner() {
  const [meals, setMeals] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const ref = doc(db, 'repas', 'semaine');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const normalized = {};
        for (const j of jours) {
          normalized[j] = {
            lunch: Array.isArray(data[j]?.lunch) ? data[j].lunch : data[j]?.lunch ? [data[j].lunch] : [],
            souper: Array.isArray(data[j]?.souper) ? data[j].souper : data[j]?.souper ? [data[j].souper] : []
          };
        }
        setMeals(normalized);
      } else {
        const defaultMeals = {};
        jours.forEach(j => defaultMeals[j] = { lunch: [], souper: [] });
        setMeals(defaultMeals);
        await setDoc(ref, defaultMeals);
      }
    };
    fetchData();
  }, []);

  const updateMeal = async (jour, type, name) => {
    const newMeals = { ...meals };
    if (!newMeals[jour][type.toLowerCase()].includes(name)) {
      newMeals[jour][type.toLowerCase()].push(name);
      setMeals(newMeals);
      await setDoc(doc(db, 'repas', 'semaine'), newMeals);
    }
  };

  const removeMeal = async (jour, type, name) => {
    const newMeals = { ...meals };
    newMeals[jour][type.toLowerCase()] = newMeals[jour][type.toLowerCase()].filter(m => m !== name);
    setMeals(newMeals);
    await setDoc(doc(db, 'repas', 'semaine'), newMeals);
  };

  const clearAllMeals = async () => {
    const cleared = {};
    jours.forEach(j => cleared[j] = { lunch: [], souper: [] });
    setMeals(cleared);
    await setDoc(doc(db, 'repas', 'semaine'), cleared);
  };

  const getUsedDays = (mealName) => {
    const used = [];
    for (const [j, dayMeals] of Object.entries(meals)) {
      const all = [...(dayMeals.lunch || []), ...(dayMeals.souper || [])];
      if (all.includes(mealName)) used.push(jourAbbr[j]);
    }
    return used;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="meal-planner-full">
        <div className="meal-suggestions">
          <h4>🍱 Lunchs</h4>
          {suggestionsLunch.map((name, i) => (
            <DraggableSuggestion key={i} name={name} type="Lunch" getUsedDays={getUsedDays} />
          ))}
          <h4>🍽 Soupers</h4>
          {suggestionsSouper.map((name, i) => (
            <DraggableSuggestion key={i} name={name} type="Souper" getUsedDays={getUsedDays} />
          ))}
          <button className="clear-btn" onClick={clearAllMeals}>🧹 Vider la semaine</button>
        </div>

        <div className="meal-grid">
          {jours.map((jour) => (
            <div key={jour} className="meal-day-card">
              <h5>{jour}</h5>
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
