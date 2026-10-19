import React from 'react';
import { createRoot } from 'react-dom/client';
import StudentApp from './StudentApp';
import '../../student-learning/src/learning-experience.css';
import '../../student-learning/src/navigation-cleanup.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudentApp /></React.StrictMode>
);
