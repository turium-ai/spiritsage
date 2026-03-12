import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, RefreshCw } from 'lucide-react';

const TrendingSection = ({ onSelectTrend }) => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        // Uses the configured Vite proxy or production API route defined in App.jsx
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal ? '' : 'https://spiritsage-backend-447843351231.us-central1.run.app';
        
        const response = await fetch(`${baseUrl}/api/trends`);
        if (!response.ok) {
          throw new Error('Failed to fetch TikTok trends');
        }
        
        let data = await response.json();
        // Fallback robust parsing in case Gemini returned it slightly weirdly
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch(e) {}
        }
        
        if (Array.isArray(data)) {
           setTrends(data);
        } else {
           throw new Error("Invalid trend format received");
        }
      } catch (err) {
        console.error('Error loading trends:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="trends-loading animate-fade-in">
        <RefreshCw className="spinner" size={32} />
        <p style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>Analyzing #DrinkTok trends...</p>
      </div>
    );
  }

  if (error || trends.length === 0) {
     return null; // Fail silently so the rest of the homepage works fine
  }

  return (
    <section className="trends-section animate-fade-in">
      <div className="trends-layout-wrapper px-4 md:px-8">
        <div className="trends-header">
          <div className="trends-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <h2>Trending on TikTok</h2>
          <span className="trends-badge">Live Analysis</span>
        </div>

        <div className="trends-grid">
          {trends.slice(0, 4).map((trend, idx) => (
            <div 
              key={idx}
              className="glass trend-card"
              onClick={() => {
                onSelectTrend(trend);
              }}
            >
              <h3 className="trend-title">
                {trend.trendName}
              </h3>
              
              <p className="trend-desc">
                "{trend.description}"
              </p>

              <div>
                <p className="trend-ingredients-title">Key Ingredients</p>
                <div className="trend-ingredients-list">
                  {(trend.keyIngredients || []).slice(0, 3).map((ing, i) => (
                    <span key={i} className="trend-ingredient-pill">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div className="trend-card-footer">
                <button className="trend-shop-btn">
                  <span>
                    <span className="dot"></span>
                    Shop Ingredients
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;
