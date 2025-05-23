import React from 'react';
import TasksRewards from '../components/TasksRewards';

function Dashboard({ children = [] }) {
  return (
    <div>
      {/* Contenu précédent inchangé jusqu'à la ligne du rendu des cartes enfants */}
      <div className="children-cards">
        {children && children.map(child => (
          <div 
            key={child.name} 
            className="child-task-card"
            style={{
              backgroundColor: `${child.color}22`,
              borderLeft: `4px solid ${child.color}`
            }}
          >
            <h3><span>{child.avatar}</span> {child.name}</h3>
            <TasksRewards user={{ uid: child.uid, displayName: child.name, avatar: child.avatar }} />
          </div>
        ))}
      </div>
      {/* Reste du contenu inchangé */}
    </div>
  );
}

export default Dashboard;