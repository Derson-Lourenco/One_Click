import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Painel from './components/Painel';
import { AuthProvider, useAuth } from './hooks/useAuth';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Painel />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;