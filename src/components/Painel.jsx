// src/components/Painel.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AbaAtivacao from './AbaAtivacao';
import AbaBusca from './AbaBusca';
import AbaProdutividade from './AbaProdutividade';
import { useAuth } from '../hooks/useAuth';
import { DataManager } from '../utils/dataManager';

const Painel = () => {
  const [activeTab, setActiveTab] = useState('ativacao');
  const [currentDate, setCurrentDate] = useState('');
  const { user } = useAuth();
  
  useEffect(() => {
    DataManager.loadFromLocalStorage();
    
    const hoje = new Date();
    setCurrentDate(hoje.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
    
    const savedTab = localStorage.getItem('aba_atual');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('aba_atual', tab);
  };
  
  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main className="main-content">
        <div className="content-header">
          <h1 id="page-title">
            {activeTab === 'ativacao' && 'Relatório / Retirada de Tempo'}
            {activeTab === 'busca' && 'Busca Avançada'}
            {activeTab === 'produtividade' && 'Produtividade por Técnico'}
          </h1>
          <div className="header-actions">
            <div className="date-badge">
              <i className="far fa-calendar-alt"></i>
              <span id="current-date">{currentDate}</span>
            </div>
          </div>
        </div>
        
        {activeTab === 'ativacao' && <AbaAtivacao usuarioLogado={user} />}
        {activeTab === 'busca' && <AbaBusca />}
        {activeTab === 'produtividade' && <AbaProdutividade />}
      </main>
      
      <div className="menu-toggle" onClick={() => document.querySelector('.sidebar').classList.toggle('active')}>
        <i className="fas fa-bars"></i>
      </div>
    </div>
  );
};

export default Painel;