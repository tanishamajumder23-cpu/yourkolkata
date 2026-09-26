import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import IntakePage from './pages/IntakePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import TripPage from './pages/TripPage.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Intake — the traveller's casual "what are you into?" link */}
        <Route path="/tell-me/:linkId" element={<IntakePage />} />
        {/* Admin — private curation page (not shared) */}
        <Route path="/admin" element={<AdminPage />} />
        {/* The reveal — the finished trip */}
        <Route path="/trip/:id" element={<TripPage />} />
        {/* Sensible default: send bare root to the admin page */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
