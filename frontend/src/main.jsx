import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        gutter={12}
        toastOptions={{
          duration: 3500,
          className: 'modern-toast',
          style: {
            background: 'rgba(10, 24, 34, 0.86)',
            color: '#e9f7ff',
            border: '1px solid rgba(255,255,255,0.16)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            borderRadius: '14px',
            padding: '12px 14px',
            fontSize: '14px',
            fontWeight: 600,
          },
          success: {
            iconTheme: {
              primary: '#3be0b2',
              secondary: '#07261f',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff6b8a',
              secondary: '#2a0d16',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
