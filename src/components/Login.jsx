import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { ALLOWED_EMAILS, PASSWORD, USERS_DATA } from '../utils/constants';
import logo from '../assets/Logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      setError('Email ou senha incorretos');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (password !== PASSWORD) {
      setError('Email ou senha incorretos');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const user = USERS_DATA.find(u => u.email === email.toLowerCase());
    login(email.toLowerCase(), user);
    
    Swal.fire({
      icon: 'success',
      title: 'Login realizado!',
      text: 'Redirecionando...',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Lado esquerdo - Logo e boas-vindas */}
        <div className="login-left">
          <div className="logo-area">
            <img src={logo} alt="THERON" className="login-logo" />
          </div>
          <div className="welcome-content">
            <h2 className="welcome-title">Plataforma ONE CLICK</h2>
            <p className="welcome-subtitle">
              Gerencie relatórios de ativação e retirada de tempo da sua equipe
            </p>
            <div className="features">
              <div className="feature-item">
                <i className="fas fa-file-alt"></i>
                <span>Relatórios de ativação</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-hourglass-half"></i>
                <span>Retirada de tempo</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-users"></i>
                <span>Gestão de equipes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito - Formulário de login */}
        <div className="login-right">
          <div className="login-form-container">
            <h3 className="form-title">Entrar no sistema</h3>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i>
                  Senha
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              
              <button type="submit" className="login-button">
                <span>Acessar sistema</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </form>
            
            <div className="login-footer">
              <p>Sistema de Gestão Técnica ONE CLICK</p>
              <p className="version">v2.2.1</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="credits">
        <p>© 2025 ONE CLICK. Todos os direitos reservados.</p>
      </div>
    </div>
  );
};

export default Login;