import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs
} from 'firebase/firestore';
import { format } from 'date-fns';
import '../styles/tasks.css';

export default function ChildTasks({ name }) {
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [consequences, setConsequences] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState('tasks');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      const taskSnap = await getDocs(collection(db, 'tasks'));
      setTasks(taskSnap.docs.map(doc => ({
        id: doc.id,
        label: doc.data().label || 'Tâche sans nom',
        value: doc.data().value || 0,
        done: false
      })));

      const rewardSnap = await getDocs(collection(db, 'rewards'));
      setRewards(rewardSnap.docs.map(doc => ({
        id: doc.id,
        label: doc.data().label || 'Récompense sans nom',
        cost: doc.data().cost || 0
      })));

      const consequenceSnap = await getDocs(collection(db, 'consequences'));
      setConsequences(consequenceSnap.docs.map(doc => ({
        id: doc.id,
        label: doc.data().label || 'Conséquence sans nom',
        cost: doc.data().cost || 0
      })));
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchPoints = async () => {
      const totalSnap = await getDoc(doc(db, 'points', name));
      setPointsTotal(totalSnap.exists() ? totalSnap.data().value : 0);

      const col = collection(db, 'taskHistory', name, today);
      const snap = await getDocs(col);
      const todaySum = snap.docs
        .filter(doc => doc.data().type === 'task')
        .reduce((sum, doc) => sum + doc.data().value, 0);
      setPointsToday(todaySum);

      setLoading(false);
    };

    fetchPoints();
  }, [name]);

  const handleTaskClick = async (task) => {
    if (task.done) return;

    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, done: true } : t
    );
    setTasks(updated);

    const newTotal = pointsTotal + task.value;
    setPointsTotal(newTotal);
    setPointsToday(prev => prev + task.value);
    await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true });

    await addDoc(collection(db, 'taskHistory', name, today), {
      label: task.label,
      value: task.value,
      type: 'task',
      date: new Date().toISOString()
    });

    setTimeout(() => {
      setTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, done: false } : t)
      );
    }, 3000);
  };

  const handleRewardClick = async (cost, label) => {
    if (pointsTotal >= cost) {
      const newTotal = pointsTotal - cost;
      setPointsTotal(newTotal);
      await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true });

      await addDoc(collection(db, 'taskHistory', name, today), {
        label,
        value: cost,
        type: 'reward',
        date: new Date().toISOString()
      });

      alert(`🎁 ${name} a utilisé une récompense !`);
    } else {
      alert(`⛔ Pas assez de points.`);
    }
  };

  const handleConsequenceClick = async (cost, label) => {
    const newTotal = pointsTotal - cost;
    setPointsTotal(newTotal);
    await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true });

    await addDoc(collection(db, 'taskHistory', name, today), {
      label,
      value: cost,
      type: 'consequence',
      date: new Date().toISOString()
    });

    alert(`⚠️ ${name} a reçu une conséquence.`);
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="child-tasks-container">
      <div className="points-header">
        <div className="points-badges">
          <div className="points-badge today">
            <div className="points-value">{pointsToday}</div>
            <div className="points-label">Points du jour</div>
          </div>
          <div className="points-badge total">
            <div className="points-value">{pointsTotal}</div>
            <div className="points-label">Total</div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="expand-button">
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <div>
          <div className="view-tabs">
            <button 
              className={`tab ${view === 'tasks' ? 'active' : ''}`}
              onClick={() => setView('tasks')}
            >
              ✅ Tâches
            </button>
            <button 
              className={`tab ${view === 'rewards' ? 'active' : ''}`}
              onClick={() => setView('rewards')}
            >
              🎁 Récompenses
            </button>
            <button 
              className={`tab ${view === 'consequences' ? 'active' : ''}`}
              onClick={() => setView('consequences')}
            >
              ⚠️ Conséq.
            </button>
          </div>

          {view === 'tasks' && (
            <ul className="items-list">
              {tasks.map(task => (
                <li 
                  key={task.id} 
                  className={`item-row ${task.done ? 'done' : ''}`}
                  onClick={() => handleTaskClick(task)}
                >
                  <span className="item-label">{task.label}</span>
                  <span className="points-tag">{task.value} pts</span>
                </li>
              ))}
            </ul>
          )}

          {view === 'rewards' && (
            <ul className="items-list">
              {rewards.map(reward => (
                <li 
                  key={reward.id} 
                  className="item-row"
                  onClick={() => handleRewardClick(reward.cost, reward.label)}
                >
                  <span className="item-label">{reward.label}</span>
                  <span className="points-tag cost">{reward.cost} pts</span>
                </li>
              ))}
            </ul>
          )}

          {view === 'consequences' && (
            <ul className="items-list">
              {consequences.map(consequence => (
                <li 
                  key={consequence.id} 
                  className="item-row"
                  onClick={() => handleConsequenceClick(consequence.cost, consequence.label)}
                >
                  <span className="item-label">{consequence.label}</span>
                  <span className="points-tag negative">{consequence.cost} pts</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}