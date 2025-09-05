/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

declare const Chart: any;

const eyeOpenIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const eyeClosedIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

interface LogEntry {
  nome: string;
  empresa: string;
  data: string;
  horario: string;
}

const App = () => {
  const [view, setView] = useState<'login' | 'dashboard' | 'iframe'>('login');
  const [iframeUrl, setIframeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // User login state
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasswordVisible, setAdminPasswordVisible] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState({ name: '', date: '', month: '' });

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // --- API Handlers ---

  const handleUserLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const response = await fetch('https://webhook.triad3.io/webhook/login-dash-vendedores-grupoboaterra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.Link) {
        setIframeUrl(data.Link);
        setView('iframe');
        sessionStorage.setItem('view', 'iframe');
        sessionStorage.setItem('iframeUrl', data.Link);
      } else {
        alert('Erro: o link não foi retornado pelo servidor.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao tentar fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const form = event.currentTarget;
    const email = (form.elements.namedItem('admin-email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('admin-password') as HTMLInputElement).value;
    
    try {
        const response = await fetch('https://webhook.triad3.io/webhook/acesso-adm-boaterra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          throw new Error('Credenciais de administrador inválidas.');
        }
        const data = await response.json();

        if (data.resposta && data.nome) {
            setAdminName(data.nome);
            setShowAdminModal(false);
            setView('dashboard');
            sessionStorage.setItem('view', 'dashboard');
            sessionStorage.setItem('adminName', data.nome);
        } else {
            throw new Error('Resposta inesperada do servidor.');
        }
    } catch (error: any) {
        console.error('Erro no login de admin:', error);
        alert(error.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('https://webhook.triad3.io/webhook/boaterra-getlogs');
      if (!response.ok) throw new Error('Falha ao buscar os logs do servidor.');
      
      let logs: LogEntry[] = await response.json();
      
      logs.sort((a, b) => {
        const [dayA, monthA, yearA] = a.data.split('/');
        const [dayB, monthB, yearB] = b.data.split('/');
        const dateA = new Date(`${yearA}-${monthA}-${dayA}T${a.horario}`);
        const dateB = new Date(`${yearB}-${monthB}-${dayB}T${b.horario}`);
        return dateB.getTime() - dateA.getTime();
      });

      setAllLogs(logs);
      setFilteredLogs(logs);
    } catch (error: any) {
      console.error('Erro ao buscar ou processar logs:', error);
      alert(error.message);
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('view');
    sessionStorage.removeItem('iframeUrl');
    sessionStorage.removeItem('adminName');
    setView('login');
    setIframeUrl('');
    setAdminName('');
  };

  // --- Effects ---

  useEffect(() => {
    const savedView = sessionStorage.getItem('view') as 'login' | 'dashboard' | 'iframe' | null;
    const savedIframeUrl = sessionStorage.getItem('iframeUrl');
    const savedAdminName = sessionStorage.getItem('adminName');

    if (savedView === 'iframe' && savedIframeUrl) {
      setView('iframe');
      setIframeUrl(savedIframeUrl);
    } else if (savedView === 'dashboard' && savedAdminName) {
      setView('dashboard');
      setAdminName(savedAdminName);
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      fetchLogs();
    }
  }, [view]);

  useEffect(() => {
    let newFilteredLogs = [...allLogs];
    const { name, date, month } = filters;

    if (name) {
      const nameLower = name.toLowerCase();
      newFilteredLogs = newFilteredLogs.filter(log => 
        log.nome.toLowerCase().includes(nameLower) || 
        log.empresa.toLowerCase().includes(nameLower)
      );
    }
    
    if (date) {
      const [year, month, day] = date.split('-');
      const formattedDateFilter = `${day}/${month}/${year}`;
      newFilteredLogs = newFilteredLogs.filter(log => log.data === formattedDateFilter);
    } else if (month) {
      const [year, monthVal] = month.split('-');
      const formattedMonthFilter = `${monthVal}/${year}`;
      newFilteredLogs = newFilteredLogs.filter(log => {
        const [, logMonth, logYear] = log.data.split('/');
        return `${logMonth}/${logYear}` === formattedMonthFilter;
      });
    }

    setFilteredLogs(newFilteredLogs);
  }, [filters, allLogs]);

  useEffect(() => {
    if (!chartCanvasRef.current || view !== 'dashboard') return;

    const loginsPerDay = filteredLogs.reduce((acc, log) => {
      acc[log.data] = (acc[log.data] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedDates = Object.keys(loginsPerDay).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/');
      const [dayB, monthB, yearB] = b.split('/');
      return new Date(`${yearA}-${monthA}-${dayA}`).getTime() - new Date(`${yearB}-${monthB}-${dayB}`).getTime();
    });

    const chartLabels = sortedDates;
    const chartData = sortedDates.map(date => loginsPerDay[date]);
    
    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    Chart.defaults.font.family = "'Rajdhani', sans-serif";
    Chart.defaults.color = 'var(--text-primary)';

    chartInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Logins por Dia',
                data: chartData,
                backgroundColor: 'rgba(0, 224, 239, 0.6)',
                borderColor: 'rgba(0, 240, 255, 1)',
                borderWidth: 1.5,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(0, 240, 255, 0.8)',
                hoverBorderColor: 'rgba(0, 240, 255, 1)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: 'var(--text-primary)', precision: 0, font: { size: 14, weight: '600' }},
                    grid: { color: 'rgba(0, 240, 255, 0.25)', drawBorder: false }
                },
                x: {
                    ticks: { color: 'var(--text-primary)', font: { size: 14, weight: '600' }},
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                  display: true,
                  text: 'Volume de Acessos Diários',
                  color: 'var(--primary-light)',
                  padding: { bottom: 20 },
                  font: { size: 20, family: "'Orbitron', monospace", weight: '800' }
                },
                tooltip: {
                    backgroundColor: 'rgba(5, 7, 12, 0.9)',
                    borderColor: 'var(--glass-border)',
                    borderWidth: 1,
                    padding: 12,
                    titleColor: 'var(--primary-light)',
                    bodyColor: 'var(--text-primary)',
                    titleFont: { family: "'Orbitron', monospace", size: 16 },
                    bodyFont: { family: "'Rajdhani', sans-serif", size: 14 }
                }
            }
        }
    });
  }, [filteredLogs, view]);

  // Anti-DevTools Effect
  useEffect(() => {
    const isMobileOrTablet = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isMobileOrTablet()) return;

    let intervalId: number;

    const wipePageAndStop = () => {
      clearInterval(intervalId);
      document.body.innerHTML = `<div style="background-color: var(--darker, #05070c); color: var(--text-primary, white); width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: var(--font-display, monospace);"><h1 style="text-align:center;">Acesso Bloqueado ❌</h1></div>`;
    };

    const blockDevTools = (e: KeyboardEvent) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.ctrlKey && e.key.toUpperCase() === 'U')) {
            e.preventDefault();
            wipePageAndStop();
        }
    };
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    
    document.addEventListener('keydown', blockDevTools);
    document.addEventListener('contextmenu', blockContextMenu);
    
    const devtoolsCheck = () => {
        const threshold = 160;
        
        // Check 1: Window size difference
        const widthDifference = window.outerWidth - window.innerWidth;
        const heightDifference = window.outerHeight - window.innerHeight;

        if (widthDifference > threshold || heightDifference > threshold) {
            wipePageAndStop();
            return;
        }

        // Check 2: Debugger statement timing
        const start = performance.now();
        debugger; // This will pause execution if DevTools is open
        const end = performance.now();
        
        if (end - start > 100) { // 100ms threshold
            wipePageAndStop();
        }
    };

    intervalId = setInterval(devtoolsCheck, 500);

    return () => {
        document.removeEventListener('keydown', blockDevTools);
        document.removeEventListener('contextmenu', blockContextMenu);
        clearInterval(intervalId);
    };
  }, []);
  
  const renderLogin = () => (
    <div className="login-container">
      <div className="matrix-bg"></div>
      <div className="floating-particles">{[...Array(8)].map((_, i) => <div key={i} className="particle"></div>)}</div>
      <div className="container">
        <div className="login-card">
          <div className="hologram-effect"></div>
          <div className="login-header">
            <div className="logo-container">
              <img src="https://aisfizoyfpcisykarrnt.supabase.co/storage/v1/object/public/imagens/LOGO%20TRIAD3%20.png" alt="Triad3 Logo" className="logo" />
            </div>
            <h1>Radar de Leads</h1>
            <div className="scanner"></div>
          </div>
          <form className="login-form" onSubmit={handleUserLogin}>
            <div className="input-group">
              <div className="input-container">
                <input type="email" id="email" name="email" required placeholder=" " />
                <label htmlFor="email">Digite seu e-mail</label>
                <div className="cyber-glow"></div>
              </div>
            </div>
            <div className="input-group">
              <div className="input-container">
                <input type={passwordVisible ? "text" : "password"} id="password" name="password" required placeholder=" " />
                <label htmlFor="password">Digite sua senha</label>
                <span className="toggle-password-visibility" onClick={() => setPasswordVisible(!passwordVisible)}>
                  {passwordVisible ? eyeClosedIcon : eyeOpenIcon}
                </span>
                <div className="cyber-glow"></div>
              </div>
            </div>
            <button type="submit" className="cyber-button login-btn" disabled={isLoading}>
              <span className="button-text">{isLoading ? 'Entrando...' : 'Entrar'}</span>
              <span className="digital-rain"></span>
            </button>
            <div className="quantum-divider"><span className="quantum-line"></span><span className="quantum-text">ou</span><span className="quantum-line"></span></div>
            <button type="button" className="ghost-button signup-btn"><span className="button-text">Criar nova conta</span></button>
            <button type="button" className="admin-link" onClick={() => setShowAdminModal(true)}>Acesso Administrativo</button>
          </form>
        </div>
      </div>
      {showAdminModal && renderAdminModal()}
    </div>
  );

  const renderAdminModal = () => (
    <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <span className="close-modal" onClick={() => setShowAdminModal(false)}>&times;</span>
        <h2>Acesso Administrativo</h2>
        <form id="admin-login-form" onSubmit={handleAdminLogin}>
          <div className="input-group">
            <div className="input-container">
              <input type="email" id="admin-email" name="admin-email" required placeholder=" "/>
              <label htmlFor="admin-email">E-mail do Administrador</label>
              <div className="cyber-glow"></div>
            </div>
          </div>
          <div className="input-group">
            <div className="input-container">
              <input type={adminPasswordVisible ? "text" : "password"} id="admin-password" name="admin-password" required placeholder=" "/>
              <label htmlFor="admin-password">Senha do Administrador</label>
               <span className="toggle-password-visibility" onClick={() => setAdminPasswordVisible(!adminPasswordVisible)}>
                  {adminPasswordVisible ? eyeClosedIcon : eyeOpenIcon}
                </span>
              <div className="cyber-glow"></div>
            </div>
          </div>
          <button type="submit" className="cyber-button" disabled={isLoading}>
            <span className="button-text">{isLoading ? 'Validando...' : 'Entrar'}</span>
            <span className="digital-rain"></span>
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="admin-dashboard-container">
      <header className="dashboard-header">
        <h1>Painel de Logs</h1>
        <p>Seja bem-vindo(a), <span id="admin-name">{adminName}</span>!</p>
      </header>
      <div className="dashboard-filters">
        <div className="filter-group"><input type="text" placeholder="Filtrar por nome ou empresa..." value={filters.name} onChange={e => setFilters({...filters, name: e.target.value, date: '', month: ''})} /></div>
        <div className="filter-group"><input type="date" title="Filtrar por dia" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value, month: ''})} /></div>
        <div className="filter-group"><input type="month" title="Filtrar por mês" value={filters.month} onChange={e => setFilters({...filters, month: e.target.value, date: ''})} /></div>
        <button className="ghost-button" onClick={() => setFilters({ name: '', date: '', month: '' })}>
          <span className="button-text">Limpar Filtros</span>
        </button>
      </div>
      <main className="dashboard-content">
        <div className="chart-container"><canvas ref={chartCanvasRef}></canvas></div>
        <div className="table-container">
          <h2>Registros de Acesso</h2>
          <table className="logs-table">
            <thead><tr><th>Nome</th><th>Empresa</th><th>Data</th><th>Horário</th></tr></thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr key={index}><td>{log.nome}</td><td>{log.empresa}</td><td>{log.data}</td><td>{log.horario}</td></tr>
                ))
              ) : (
                <tr><td colSpan={4} className="no-results-message">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );

  const renderIframe = () => (
    <div className="iframe-view">
      <header className="iframe-header">
        <button onClick={handleLogout} className="back-button">
          &larr; Voltar
        </button>
        <h1 className="header-title">Radar de Leads</h1>
      </header>
      <div className="iframe-container">
        <iframe id="hiddenFrame" src={iframeUrl} title="Dashboard Content"></iframe>
        <div className="logo-overlay"></div>
      </div>
    </div>
  );

  switch (view) {
    case 'dashboard': return renderDashboard();
    case 'iframe': return renderIframe();
    case 'login':
    default: return renderLogin();
  }
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}