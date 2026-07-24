import React from 'react';
import { createRoot } from 'react-dom/client';
import CmsApp from './CmsApp';

createRoot(document.getElementById('root')!).render(<React.StrictMode><CmsApp/></React.StrictMode>);
