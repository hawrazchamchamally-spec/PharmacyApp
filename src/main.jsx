import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { PharmacyProvider } from './context/PharmacyContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PharmacyProvider>
      <App />
    </PharmacyProvider>
  </React.StrictMode>
);

