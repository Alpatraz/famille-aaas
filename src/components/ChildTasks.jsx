import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  doc, setDoc, getDoc,
  collection, addDoc, getDocs
} from 'firebase/firestore';
import { format } from 'date-fns';
import '../styles/tasks.css';

export default function ChildTasks({ user }) {
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
      if (!user?.id && !user?.displayName) {
        setLoading(false);
        return;
      }

      try {
        const userId = user.id || user.displayName;
        const totalSnap = await getDoc(doc(db, 'points', userId));
        setPointsTotal(totalSnap.exists() ? totalSnap.data().value : 0);

        const col = collection(db, 'taskHistory', userId, today);
        const snap = await getDocs(col);
        const todaySum = snap.docs
          .filter(doc => doc.data().type === 'task')
          .reduce((sum, doc) => sum + doc.data().value, 0);
        setPointsToday(todaySum);
      } catch (error) {
        console.error('Error fetching points:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, [user, today]);

  const handleTaskClick = async (task) => {
    if (!user?.id && !user?.displayName) return;
    
    const userId = user.id || user.displayName;
    const taskDone = !task.done;
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, done: taskDone } : t
    ));

    const delta = taskDone ? task.value : -task.value;
    const newTotal = pointsTotal + delta;
    setPointsTotal(newTotal);
    setPointsToday(prev => prev + (taskDone ? task.value : -task.value));
    await setDoc(doc(db, 'points', userId), { value: newTotal }, { merge: true });

    if (taskDone) {
      await addDoc(collection(db, 'taskHistory', userId, today), {
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
    }
  };

  const handleRewardClick = async (reward) => {
    if (!user?.id && !user?.displayName) return;
    
    const userId = user.id || user.displayName;
    if (pointsTotal >= reward.cost) {
      const newTotal = pointsTotal - reward.cost;
      setPointsTotal(newTotal);
      await setDoc(doc(db, 'points', userId), { value: newTotal }, { merge: true });

      await addDoc(collection(db, 'taskHistory', userId, today), {
        label: reward.label,
        value: reward.cost,
        type: 'reward',
        date: new Date().toISOString()
      });

      alert(`🎁 ${user.displayName || 'Utilisateur'} a utilisé une récompense !`);
    } else {
      alert(`⛔ Pas assez de points.`);
    }
  };

  const handleConsequenceClick = async (consequence) => {
    if (!user?.id && !user?.displayName) return;
    
    const userId = user.id || user.displayName;
    const newTotal = pointsTotal - consequence.cost;
    setPointsTotal(newTotal);
    await setDoc(doc(db, 'points', userId), { value: newTotal }, { merge: true });

    await addDoc(collection(db, 'taskHistory', userId, today), {
      label: consequence.label,
      value: consequence.cost,
      type: 'consequence',
      date: new Date().toISOString()
    });

    alert(`⚠️ ${user.displayName || 'Utilisateur'} a reçu une conséquence.`);
  };

  if (!user) {
    return <p>Chargement de l'utilisateur...</p>;
  }

  if (loading) {
    return <p>Chargement...</p>;
  }

  const backgroundColor = user.color ? `${user.color}33` : '#f8fafc';

  return (
    <div className="child-tasks-container" style={{ background: backgroundColor }}>
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
        <button 
          className="expand-button"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Réduire" : "Développer"}
        >
          {expanded ? '➖' : '➕'}
        </button>
      </div>

      {expanded && (
        <div className="tasks-content">
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
              🎁 Réc.
            </button>
            <button 
              className={`tab ${view === 'consequences' ? 'active' : ''}`}
              onClick={() => setView('consequences')}
            >
              ⚠️ Cons.
            </button>
          </div>

          {view === 'tasks' && (
            <ul className="items-list tasks-list">
              {tasks.map(task => (
                <li 
                  key={task.id} 
                  className={`item-row ${task.done ? 'done' : ''}`}
                  onClick={() => handleTaskClick(task)}
                >
                  <span className="item-label">{task.label}</span>
                  <span className="points-tag">+{task.value}</span>
                </li>
              ))}
            </ul>
          )}

          {view === 'rewards' && (
            <ul className="items-list rewards-list">
              {rewards.map(reward => (
                <li 
                  key={reward.id} 
                  className="item-row"
                  onClick={() => handleRewardClick(reward)}
                >
                  <span className="item-label">{reward.label}</span>
                  <span className="points-tag cost">{reward.cost}</span>
                </li>
              ))}
            </ul>
          )}

          {view === 'consequences' && (
            <ul className="items-list consequences-list">
              {consequences.map(consequence => (
                <li 
                  key={consequence.id} 
                  className="item-row"
                  onClick={() => handleConsequenceClick(consequence)}
                >
                  <span className="item-label">{consequence.label}</span>
                  <span className="points-tag negative">-{consequence.cost}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}