import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, RotateCcw, Ban, Plus } from 'lucide-react';
import heroesData from './heroes.json';

const DraftSimulator = ({ draftState, onDraftAction, onResetDraft }) => {
  const [search, setSearch] = useState('');
  
  const { phase, turn, blueBans, redBans, bluePicks, redPicks } = draftState;

  const filteredHeroes = heroesData.filter(hero => 
    hero.name.toLowerCase().includes(search.toLowerCase())
  );

  const getHeroStatus = (name) => {
    if (blueBans.some(h => h.name === name)) return 'banned-blue';
    if (redBans.some(h => h.name === name)) return 'banned-red';
    if (bluePicks.some(h => h.name === name)) return 'picked-blue';
    if (redPicks.some(h => h.name === name)) return 'picked-red';
    return null;
  };

  const getTurnText = () => {
    if (phase === 'finished') return 'Draft Finished';
    const side = turn === 'blue' ? 'Blue' : 'Red';
    const action = phase === 'ban' ? 'Ban' : 'Pick';
    return `${side}'s ${action}`;
  };

  return (
    <div className="draft-simulator">
      <div className="draft-header glass-panel">
        <div className={`turn-indicator ${turn}`}>
          {getTurnText()}
        </div>
        <button className="reset-btn icon-btn" onClick={onResetDraft} title="Reset Draft">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="draft-board">
        <div className="draft-column blue">
          <div className="draft-label">Blue Bans</div>
          <div className="bans-row">
            {[0, 1, 2].map(i => (
              <div key={i} className="ban-slot blue">
                {blueBans[i] ? <img src={`/assets/heroes/${blueBans[i].image}`} alt="" /> : <ShieldAlert size={14} />}
              </div>
            ))}
          </div>
          <div className="picks-column">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="pick-slot blue">
                {bluePicks[i] ? <img src={`/assets/heroes/${bluePicks[i].image}`} alt="" /> : <div className="slot-num">{i + 1}</div>}
                <div className="slot-name">{bluePicks[i]?.name || ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="draft-column red">
          <div className="draft-label">Red Bans</div>
          <div className="bans-row">
            {[0, 1, 2].map(i => (
              <div key={i} className="ban-slot red">
                {redBans[i] ? <img src={`/assets/heroes/${redBans[i].image}`} alt="" /> : <ShieldAlert size={14} />}
              </div>
            ))}
          </div>
          <div className="picks-column">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="pick-slot red">
                {redPicks[i] ? <img src={`/assets/heroes/${redPicks[i].image}`} alt="" /> : <div className="slot-num">{i + 1}</div>}
                <div className="slot-name">{redPicks[i]?.name || ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="search-box glass-panel" style={{ marginTop: '20px' }}>
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search heroes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="hero-grid">
        {filteredHeroes.map(hero => {
          const status = getHeroStatus(hero.name);
          const isUnavailable = !!status;
          
          return (
            <div 
              key={hero.name} 
              className={`hero-card glass-panel ${isUnavailable ? 'unavailable' : ''}`}
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
                {!isUnavailable && phase !== 'finished' && (
                  <button 
                    className={`action-btn ${phase === 'ban' ? 'remove' : 'add'}`} 
                    onClick={() => onDraftAction(hero)}
                    title={phase === 'ban' ? 'Ban Hero' : 'Pick Hero'}
                  >
                    {phase === 'ban' ? <Ban size={14} /> : <Plus size={16} />}
                  </button>
                )}
                {isUnavailable && (
                  <div className="status-badge">
                    {status.includes('banned') ? 'Banned' : 'Picked'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DraftSimulator;
