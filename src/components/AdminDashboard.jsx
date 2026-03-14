import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, Info, Filter, RefreshCw, Clock, Terminal, ChevronDown, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch admin logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); // 3-second refresh
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = filter === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === filter || log.type === filter);

  const getLevelStyle = (level) => {
    switch (level) {
      case 'ERROR': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' };
      case 'WARN': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' };
      default: return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'GEMINI': return <Activity size={14} className="mr-1" />;
      case 'SEARCH': return <Filter size={14} className="mr-1" />;
      case 'ERROR': return <AlertCircle size={14} className="mr-1" />;
      default: return <Terminal size={14} className="mr-1" />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%',
        background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '24px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              <span style={{ color: '#d4af37' }}>SpiritSage</span>
              <span style={{ opacity: 0.5, fontWeight: 400 }}>|</span>
              <span style={{ fontSize: '24px', fontWeight: 600 }}>Command Center</span>
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>Real-time backend telemetry and AI insights.</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              fontSize: '12px', 
              color: '#64748b',
              background: 'rgba(255,255,255,0.03)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Last polled: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {[
            { label: 'Total Events', value: logs.length, icon: <Terminal size={18} /> },
            { label: 'Errors', value: logs.filter(l => l.level === 'ERROR').length, icon: <AlertCircle size={18} />, color: '#ef4444' },
            { label: 'Gemini Calls', value: logs.filter(l => l.type === 'GEMINI').length, icon: <Activity size={18} />, color: '#d4af37' },
            { label: 'System Health', value: 'Nominal', icon: <Info size={18} />, color: '#22c55e' }
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</p>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: stat.color || '#fff' }}>{stat.value}</h3>
              </div>
              <div style={{ color: stat.color || '#64748b', opacity: 0.8 }}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
          {['ALL', 'INFO', 'WARN', 'ERROR', 'GEMINI', 'SEARCH', 'SYSTEM'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: filter === f ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                background: filter === f ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                color: filter === f ? '#d4af37' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Log List */}
        <div style={{
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 100px 120px 1fr',
            padding: '16px 24px',
            background: 'rgba(255,255,255,0.03)',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#64748b',
            letterSpacing: '1px'
          }}>
            <div>Timestamp</div>
            <div>Level</div>
            <div>Type</div>
            <div>Message</div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>
                <Clock size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <p>No telemetry data matches current filter.</p>
              </div>
            ) : (
              filteredLogs.map((log, i) => {
                const style = getLevelStyle(log.level);
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 100px 120px 1fr',
                    padding: '14px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    fontSize: '13px',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ color: '#475569', fontFamily: 'monospace' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`
                      }}>
                        {log.level}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontWeight: 500 }}>
                      {getTypeIcon(log.type)}
                      {log.type}
                    </div>
                    <div style={{ color: '#cbd5e1' }}>
                      {log.message}
                      {log.details && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#64748b', 
                          marginTop: '4px', 
                          background: 'rgba(0,0,0,0.2)',
                          padding: '6px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}>
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
