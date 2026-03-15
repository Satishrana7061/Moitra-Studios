import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);

// Grab the base URL injected by Vite (e.g., '/Moitra-Studios/') so the React Router doesn't strip it
const basename = import.meta.env.BASE_URL;

root.render(
  <React.StrictMode>
    <BrowserRouter basename={basename === '/' ? '' : basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);