import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import VerifyProof from './pages/VerifyProof.jsx';
import './index.css';

// Lightweight path-based routing (no router dependency): the public proof
// verification page lives at /verify; everything else is the main app.
const isVerifyPage = window.location.pathname.replace(/\/+$/, '') === '/verify';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isVerifyPage ? <VerifyProof /> : <App />}</React.StrictMode>
);
