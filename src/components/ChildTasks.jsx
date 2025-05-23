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

  const handleTaskToggle = async (id) => {
    const task = tasks.find(t => t.id === id);
    const updated = tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(updated);

    const taskDone = !task.done;
    const delta = taskDone ? task.value : -task.value;
    const newTotal = pointsTotal + delta;
    setPointsTotal(newTotal);
    setPointsToday(prev => prev + (taskDone ? task.value : -task.value));
    await setDoc(doc(db, 'points', name), { value: newTotal }, { merge: true });

    if (taskDone) {
      await addDoc(collection(db, 'taskHistory', name, today), {
        label: task.label,
        value: task.value,
        type: 'task',
        date: new Date().toISOString()
      });

      setTimeout(() => {
        setTasks(prev =>
          prev.map(t => t.id === id ? { ...t, done: false } : t)
        );
      }, 3000);
    }
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
    <div className="dashboard-section" style={{ background: '#fdfdfd', borderRadius: '8px', padding: '1rem', boxShadow: '0 0 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{name}</strong><br />
          <small>🎯 Points du jour : <strong>{pointsToday}</strong></small><br />
          <small>💰 Total : <strong>{pointsTotal}</strong></small>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <button onClick={() => setView('tasks')} style={{ background: view === 'tasks' ? '#d0e9ff' : '#eee', border: '1px solid #ccc', borderRadius: '6px', padding: '0.3rem 0.6rem' }}>✅ Tâches</button>
            <button onClick={() => setView('rewards')} style={{ background: view === 'rewards' ? '#d0ffd9' : '#eee', border: '1px solid #ccc', borderRadius: '6px', padding: '0.3rem 0.6rem' }}>🎁 Récompenses</button>
            <button onClick={() => setView('consequences')} style={{ background: view === 'consequences' ? '#ffe0e0' : '#eee', border: '1px solid #ccc', borderRadius: '6px', padding: '0.3rem 0.6rem' }}>⚠️ Conséquences</button>
          </div>

          {view === 'tasks' && (
            <ul className="task-list">
              {tasks.map(task => (
                <li key={task.id} className="task-row">
                  <span className="task-label">{task.label}</span>
                  <span className="tag">+{task.value} pts</span>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => handleTaskToggle(task.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {view === 'rewards' && (
            <ul className="reward-list">
              {rewards.map(reward => (
                <li key={reward.id} className="reward-row">
                  <span className="reward-label">{reward.label}</span>
                  <span className="tag">{reward.cost} pts</span>
                  <button className="reward-button" onClick={() => handleRewardClick(reward.cost, reward.label)}>Utiliser 🎁</button>
                </li>
              ))}
            </ul>
          )}

          {view === 'consequences' && (
            <ul className="consequence-list">
              {consequences.map(consequence => (
                <li key={consequence.id} className="consequence-row">
                  <span className="consequence-label">{consequence.label}</span>
                  <span className="tag">-{consequence.cost} pts</span>
                  <button className="consequence-button" onClick={() => handleConsequenceClick(consequence.cost, consequence.label)}>Appliquer ⚠️</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
