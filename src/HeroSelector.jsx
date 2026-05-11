import React, { useState } from 'react';
import { Search } from 'lucide-react';
import heroesData from './heroes.json';

const HeroSelector = ({ onDragStart }) => {
  const [search, setSearch] = useState('');

  const filteredHeroes = heroesData.filter(hero => 
    hero.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="hero-selector">
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
        {filteredHeroes.map(hero => (
          <div 
            key={hero.name} 
            className="hero-card glass-panel" 
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('hero', JSON.stringify(hero));
            }}
          >
            <img 
              src={`/assets/heroes/${hero.image}`} 
              alt={hero.name} 
              className="hero-avatar"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hero-avatar-placeholder" style={{ display: 'none' }}>
              {hero.name[0]}
            </div>
            <div className="hero-info">
              <div className="hero-name">{hero.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSelector;
