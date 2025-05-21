import React, { useEffect, useState } from 'react';
import { db } from '../firebase'; // Assure-toi que ce chemin est bon
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './MealPlanner.css';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const MealItem = ({ type, jour, meal, onChange }) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'MEAL',
    item: { jour, type, meal },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: 'MEAL',
    drop: (item) => {
      onChange(item.jour, item.type, '', true); // efface l'ancien
      onChange(jour, type, item.meal);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => dragRef(dropRef(node))}
      className={`meal-box ${isDragging ? 'dragging' : ''} ${isOver ? 'hovered' : ''}`}
      onClick={() => {
        const nouveau = prompt(`Modifier le ${type.toLowerCase()} de ${jour}`, meal);
        if (nouveau !== null) onChange(jour, type, nouveau);
      }}
    >
      <strong>{type} :</strong> {meal || '—'}
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
        setMeals(snap.data());
      } else {
        const defaultMeals = {};
        jours.forEach(j => defaultMeals[j] = {
          lunch: `Suggestion lunch ${j}`,
          souper: `Suggestion souper ${j}`,
        });
        setMeals(defaultMeals);
        await setDoc(ref, defaultMeals);
      }
    };
    fetchData();
  }, []);

  const handleChange = async (jour, type, value, remove = false) => {
    const newMeals = { ...meals };
    if (!newMeals[jour]) newMeals[jour] = {};
    newMeals[jour][type.toLowerCase()] = remove ? '' : value;
    setMeals(newMeals);
    await setDoc(doc(db, 'repas', 'semaine'), newMeals);
  };

  return (
    <div className="meal-planner-container">
      <h3 className="title">🍽️ Plan des repas</h3>
      <DndProvider backend={HTML5Backend}>
        <div className="grid-meals">
          {jours.map((jour) => (
            <div key={jour} className="meal-card">
              <h4>{jour}</h4>
              <MealItem
                type="Lunch"
                jour={jour}
                meal={meals[jour]?.lunch || ''}
                onChange={handleChange}
              />
              <MealItem
                type="Souper"
                jour={jour}
                meal={meals[jour]?.souper || ''}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>
      </DndProvider>
    </div>
  );
}
