import React from 'react';
import { createRoot } from 'react-dom/client';
import StudentApp from './StudentApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><StudentApp /></React.StrictMode>
);
