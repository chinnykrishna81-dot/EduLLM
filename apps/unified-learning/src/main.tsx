import React from 'react';
import { createRoot } from 'react-dom/client';
import StudentApp from './StudentApp';
import './learning-experience.css';
import '../../competency-patterns.css';
import './navigation-cleanup.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudentApp /></React.StrictMode>
);
