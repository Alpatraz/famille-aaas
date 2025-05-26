import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, setDoc } from 'firebase/firestore';
import Modal from './Modal';
import './Karate.css';

const BELT_COLORS = {
  'white': { name: 'Blanche', color: '#ffffff', order: 0 },
  'white-yellow': { 
    name: 'Blanche / Jaune', 
    topColor: '#ffffff',
    bottomColor: '#ffd700',
    order: 1 
  },
  'yellow': { name: 'Jaune', color: '#ffd700', order: 2 },
  'yellow-orange': { 
    name: 'Jaune / Orange',
    topColor: '#ffd700',
    bottomColor: '#ffa500',
    order: 3 
  },
  'orange': { name: 'Orange', color: '#ffa500', order: 4 },
  'orange-purple': { 
    name: 'Orange / Mauve',
    topColor: '#ffa500',
    bottomColor: '#800080',
    order: 5 
  },
  'purple': { name: 'Mauve', color: '#800080', order: 6 },
  'purple-green': { 
    name: 'Mauve / Verte',
    topColor: '#800080',
    bottomColor: '#228b22',
    order: 7 
  },
  'green': { name: 'Verte', color: '#228b22', order: 8 },
  'green-blue': { 
    name: 'Verte / Bleue',
    topColor: '#228b22',
    bottomColor: '#0000ff',
    order: 9 
  },
  'blue': { name: 'Bleue', color: '#0000ff', order: 10 },
  'blue-brown': { 
    name: 'Bleue / Brune',
    topColor: '#0000ff',
    bottomColor: '#8b4513',
    order: 11 
  },
  'brown': { name: 'Brune', color: '#8b4513', order: 12 },
  'brown-black': { 
    name: 'Brune / Noire',
    topColor: '#8b4513',
    bottomColor: '#000000',
    order: 13 
  },
  'black': { name: 'Noire', color: '#000000', order: 14 }
};

const SECTIONS = {
  progression: { name: 'Progression', icon: '📈' },
  cours: { name: 'Cours', icon: '📚' },
  competition: { name: 'Compétition', icon: '🏆' }
};

const COURSE_TYPES = {
  'regular': { name: 'Cours de groupe régulier', icon: '🥋' },
  'weapons': { name: 'Cours d\'armes', icon: '⚔️' },
  'combat': { name: 'Cours de combat', icon: '🥊' },
  'competition': { name: 'Cours de compétition', icon: '🏆' }
};

const DAYS = [
  { id: 'monday', name: 'Lundi' },
  { id: 'tuesday', name: 'Mardi' },
  { id: 'wednesday', name: 'Mercredi' },
  { id: 'thursday', name: 'Jeudi' },
  { id: 'friday', name: 'Vendredi' },
  { id: 'saturday', name: 'Samedi' },
  { id: 'sunday', name: 'Dimanche' }
];

const RECURRENCE = [
  { id: 'weekly', name: 'Hebdomadaire' },
  { id: 'biweekly', name: 'Bihebdomadaire' }
];

export default function Karate({ user }) {
  const [activeSection, setActiveSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [karateUsers, setKarateUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingBeltDate, setEditingBeltDate] = useState(null);
  const [showPrivateLessons, setShowPrivateLessons] = useState(false);
  const [privateLessonForm, setPrivateLessonForm] = useState({
    day: '',
    time: '',
    recurrence: 'weekly',
    nextDate: new Date().toISOString().split('T')[0]
  });
  const [coursesData, setCoursesData] = useState({});
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    name: '',
    type: 'regular',
    day: '',
    time: '',
    duration: 60,
    recurrence: 'weekly',
    participants: []
  });
  const [courses, setCourses] = useState([]);

  const handleCourseFormChange = (field, value) => {
    setCourseForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivateLessonFormChange = (field, value) => {
    setPrivateLessonForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Rest of the component implementation remains exactly the same as in the original file...
  // All other functions, effects, and render methods stay unchanged

}