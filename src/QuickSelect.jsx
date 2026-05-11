import React, { useState } from 'react';
import { Search, Plus, X, ArrowLeftRight } from 'lucide-react';
import heroesData from './heroes.json';

const QuickSelect = ({ blueTeam, redTeam, onAddHero, onRemoveHero, onSwapTeam }) => {
  const [search, setSearch] = useState('');
  const [activeTeam, setActiveTeam] = useState('blue');

  const filteredHeroes = heroesData.filter(hero => 
    hero.name.toLowerCase().includes(search.toLowerCase())
  );

  const getHeroTeam = (name) => {
    if (blueTeam.some(h => h.name === name)) return 'blue';
    if (redTeam.some(h => h.name === name)) return 'red';
    return null;
  };

  const getHeroId = (name, team) => {
    const list = team === 'blue' ? blueTeam : redTeam;
    return list.find(h => h.name === name)?.id;
  };

  return (
    <div className="quick-select">
      <div className="team-toggle-grid">
        <button 
          className={`team-toggle blue ${activeTeam === 'blue' ? 'active' : ''}`}
          onClick={() => setActiveTeam('blue')}
        >
          Blue Team ({blueTeam.length})
        </button>
        <button 
          className={`team-toggle red ${activeTeam === 'red' ? 'active' : ''}`}
          onClick={() => setActiveTeam('red')}
        >
          Red Team ({redTeam.length})
        </button>
      </div>

      <div className="search-box glass-panel">
        <Search size={16} />
        <input 
          type="text" 
          placeholder="Search heroes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      <div className="hero-grid">
        {filteredHeroes.map(hero => {
          const team = getHeroTeam(hero.name);
          const isSelected = !!team;
          
          return (
            <div 
              key={hero.name} 
              className={`hero-card glass-panel ${isSelected ? `selected-${team}` : ''}`}
            >
              <img 
                src={`/assets/heroes/${hero.image}`} 
                alt={hero.name} 
                className="hero-avatar"
              />
              <div className="hero-info">
                <div className="hero-name">{hero.name}</div>
              </div>
              
              <div className="hero-card-actions">
                {!isSelected ? (
                  <button 
                    className="action-btn add" 
                    onClick={() => onAddHero(hero, activeTeam)}
                    title={`Add to ${activeTeam} team`}
                  >
                    <Plus size={16} />
                  </button>
                ) : (
                  <>
                    <button 
                      className="action-btn swap" 
                      onClick={() => onSwapTeam(getHeroId(hero.name, team), team)}
                      title="Switch team"
                    >
                      <ArrowLeftRight size={14} />
                    </button>
                    <button 
                      className="action-btn remove" 
                      onClick={() => onRemoveHero(getHeroId(hero.name, team), team)}
                      title="Remove from team"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Teams Summary */}
      <div className="teams-summary">
        <div className="summary-column">
          <div className="summary-title blue">Blue</div>
          <div className="summary-list">
            {blueTeam.map(hero => (
              <div key={hero.id} className="summary-item">
                <img src={`/assets/heroes/${hero.image}`} alt="" />
                <button onClick={() => onRemoveHero(hero.id, 'blue')}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="summary-column">
          <div className="summary-title red">Red</div>
          <div className="summary-list">
            {redTeam.map(hero => (
              <div key={hero.id} className="summary-item">
                <img src={`/assets/heroes/${hero.image}`} alt="" />
                <button onClick={() => onRemoveHero(hero.id, 'red')}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSelect;
