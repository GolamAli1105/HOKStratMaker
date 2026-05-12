import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Share2, 
  Download, 
  Plus, 
  MousePointer2,
  Pencil,
  Trophy,
  UserPlus,
  RotateCcw,
  Eraser,
  Circle,
  X,
  Menu,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import './App.css';
import MapCanvas from './MapCanvas';
import QuickSelect from './QuickSelect';
import DraftSimulator from './DraftSimulator';

const DRAFT_SEQUENCE = [
  { phase: 'ban', team: 'blue' }, { phase: 'ban', team: 'red' },
  { phase: 'ban', team: 'blue' }, { phase: 'ban', team: 'red' },
  { phase: 'ban', team: 'blue' }, { phase: 'ban', team: 'red' },
  { phase: 'pick', team: 'blue' }, { phase: 'pick', team: 'red' },
  { phase: 'pick', team: 'red' }, { phase: 'pick', team: 'blue' },
  { phase: 'pick', team: 'blue' }, { phase: 'pick', team: 'red' },
  { phase: 'pick', team: 'red' }, { phase: 'pick', team: 'blue' },
  { phase: 'pick', team: 'blue' }, { phase: 'pick', team: 'red' }
];

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    className={`sidebar-item ${active ? 'active' : ''}`} 
    onClick={onClick}
    title={label}
  >
    <div className="sidebar-item-icon">
      <Icon size={20} />
    </div>
    <span>{label}</span>
    {active && <motion.div layoutId="active-pill" className="active-pill" />}
  </button>
);

function App() {
  const [activeTab, setActiveTab] = useState('teams');
  const [activeTool, setActiveTool] = useState('select');
  const [drawColor, setDrawColor] = useState('#3a86ff');
  const [brushSize, setBrushSize] = useState(4);
  const [mapImage, setMapImage] = useState('/assets/maps/Map.webp');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Frames & Timeline State
  const [frames, setFrames] = useState([
    { id: 1, name: 'Initial Setup', heroes: [], ink: [] }
  ]);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const mapContainerRef = useRef(null);

  // Quick Teams State
  const [blueTeam, setBlueTeam] = useState([]);
  const [redTeam, setRedTeam] = useState([]);

  // Draft State
  const [draftStep, setDraftStep] = useState(0);
  const [draftData, setDraftData] = useState({
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: []
  });

  // History for Undo
  const [history, setHistory] = useState([]);

  // Get current frame data
  const currentFrame = frames[activeFrameIndex];

  const saveToHistory = () => {
    const snapshot = {
      blueTeam: [...blueTeam],
      redTeam: [...redTeam],
      draftData: JSON.parse(JSON.stringify(draftData)),
      draftStep,
      frames: JSON.parse(JSON.stringify(frames)),
      activeFrameIndex
    };
    setHistory(prev => [...prev.slice(-19), snapshot]); // Keep last 20 states
  };

  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setBlueTeam(lastState.blueTeam);
    setRedTeam(lastState.redTeam);
    setDraftData(lastState.draftData);
    setDraftStep(lastState.draftStep);
    setFrames(lastState.frames || [{ id: 1, name: 'Initial Setup', heroes: [], ink: [] }]);
    setActiveFrameIndex(lastState.activeFrameIndex || 0);
    setHistory(history.slice(0, -1));
  };

  // Sync teams to active frame's hero list
  useEffect(() => {
    const roster = [
      ...blueTeam.map(h => ({ ...h, team: 'blue' })),
      ...redTeam.map(h => ({ ...h, team: 'red' })),
      ...draftData.bluePicks.map(h => ({ ...h, team: 'blue' })),
      ...draftData.redPicks.map(h => ({ ...h, team: 'red' }))
    ];

    setFrames(prev => {
      const newFrames = [...prev];
      const current = newFrames[activeFrameIndex];
      
      current.heroes = roster.map(newH => {
        const existing = current.heroes.find(h => h.id === newH.id);
        return existing ? { ...newH, x: existing.x, y: existing.y } : { ...newH };
      });

      return newFrames;
    });
  }, [blueTeam, redTeam, draftData.bluePicks, draftData.redPicks, activeFrameIndex]);

  const addFrame = () => {
    saveToHistory();
    const newFrame = {
      id: Date.now(),
      name: `Frame ${frames.length + 1}`,
      heroes: JSON.parse(JSON.stringify(currentFrame.heroes || [])),
      ink: JSON.parse(JSON.stringify(currentFrame.ink || []))
    };
    setFrames([...frames, newFrame]);
    setActiveFrameIndex(frames.length);
  };

  const deleteFrame = (index, e) => {
    e.stopPropagation();
    if (frames.length === 1) return;
    saveToHistory();
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);
    setActiveFrameIndex(Math.max(0, activeFrameIndex - 1));
  };

  const updateFrameData = (heroes, ink) => {
    setFrames(prev => {
      const next = [...prev];
      if (heroes) next[activeFrameIndex].heroes = heroes;
      if (ink) next[activeFrameIndex].ink = ink;
      return next;
    });
  };

  const renameFrame = (index, newName) => {
    setFrames(prev => {
      const next = [...prev];
      next[index].name = newName;
      return next;
    });
  };

  const exportStrategy = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const zip = new JSZip();
    const originalFrame = activeFrameIndex;

    try {
      for (let i = 0; i < frames.length; i++) {
        setActiveFrameIndex(i);
        await new Promise(resolve => setTimeout(resolve, 600)); // Slightly longer for clarity
        
        if (mapContainerRef.current) {
          const dataUrl = await toPng(mapContainerRef.current, {
            backgroundColor: '#050508',
            quality: 1,
            pixelRatio: 2
          });
          const base64Data = dataUrl.split(',')[1];
          zip.file(`frame_${i + 1}_${frames[i].name.replace(/\s+/g, '_')}.png`, base64Data, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `HOK_Strategy_${Date.now()}.zip`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setActiveFrameIndex(originalFrame);
      setIsExporting(false);
    }
  };

  const handleAddHero = (hero, team) => {
    saveToHistory();
    const teamCount = team === 'blue' ? blueTeam.length : redTeam.length;
    const newHero = { 
      ...hero, 
      id: `${team}-${hero.name}-${Date.now()}`, 
      x: team === 'blue' ? 80 : 950, 
      y: 80 + (teamCount * 100)
    };
    if (team === 'blue') setBlueTeam([...blueTeam, newHero]);
    else setRedTeam([...redTeam, newHero]);
    if (window.innerWidth < 1024) setIsMenuOpen(false); // Close menu on mobile after selection
  };

  const handleRemoveHero = (id, team) => {
    saveToHistory();
    if (team === 'blue') setBlueTeam(blueTeam.filter(h => h.id !== id));
    else setRedTeam(redTeam.filter(h => h.id !== id));
  };

  const handleDraftAction = (hero) => {
    saveToHistory();
    const currentAction = DRAFT_SEQUENCE[draftStep];
    if (!currentAction) return;

    const team = currentAction.team;
    const isPick = currentAction.phase === 'pick';
    
    let newHero = { ...hero, id: `draft-${hero.name}-${Date.now()}` };
    if (isPick) {
      const pickCount = team === 'blue' ? draftData.bluePicks.length : draftData.redPicks.length;
      newHero.x = team === 'blue' ? 80 : 950;
      newHero.y = 80 + (pickCount * 100);
    }

    const newData = { ...draftData };
    if (currentAction.phase === 'ban') {
      if (team === 'blue') newData.blueBans.push(newHero);
      else newData.redBans.push(newHero);
    } else {
      if (team === 'blue') newData.bluePicks.push(newHero);
      else newData.redPicks.push(newHero);
    }

    setDraftData(newData);
    setDraftStep(draftStep + 1);
  };

  const resetDraft = () => {
    if (window.confirm('Reset the current draft?')) {
      saveToHistory();
      setDraftData({ blueBans: [], redBans: [], bluePicks: [], redPicks: [] });
      setDraftStep(0);
    }
  };

  const handleSwapTeam = (id, currentTeam) => {
    saveToHistory();
    const heroToSwap = currentTeam === 'blue' 
      ? blueTeam.find(h => h.id === id) 
      : redTeam.find(h => h.id === id);
    
    if (!heroToSwap) return;

    if (currentTeam === 'blue') {
      setBlueTeam(blueTeam.filter(h => h.id !== id));
      setRedTeam([...redTeam, { ...heroToSwap, id: `red-${heroToSwap.name}-${Date.now()}` }]);
    } else {
      setRedTeam(redTeam.filter(h => h.id !== id));
      setBlueTeam([...blueTeam, { ...heroToSwap, id: `blue-${heroToSwap.name}-${Date.now()}` }]);
    }
  };

  const handleHeroRemove = (id) => {
    saveToHistory();
    setBlueTeam(prev => prev.filter(h => h.id !== id));
    setRedTeam(prev => prev.filter(h => h.id !== id));
    setDraftData(prev => ({
      ...prev,
      bluePicks: prev.bluePicks.filter(h => h.id !== id),
      redPicks: prev.redPicks.filter(h => h.id !== id)
    }));
  };

  const clearAll = () => {
    if (window.confirm('Clear all heroes and drawings?')) {
      saveToHistory();
      setBlueTeam([]);
      setRedTeam([]);
      setDraftData({ blueBans: [], redBans: [], bluePicks: [], redPicks: [] });
      setDraftStep(0);
      setFrames(prev => prev.map(f => ({ ...f, heroes: [], ink: [] })));
    }
  };

  const currentDraftStep = DRAFT_SEQUENCE[draftStep] || { phase: 'finished', team: 'none' };

  return (
    <div className="app-container">
      <header className="navbar glass-panel">
        <div className="nav-left">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="logo">
            <span className="logo-gold">HOK</span> Strat Maker
          </div>
        </div>
        
        <div className="nav-right desktop-actions">
          <button 
            className="nav-btn" 
            onClick={undo} 
            disabled={history.length === 0}
          >
            <RotateCcw size={18} /> <span>Undo</span>
          </button>
          <button className="nav-btn" onClick={clearAll}>
            <Plus size={18} /> <span>Reset</span>
          </button>
          <button 
            className={`premium-button ${isExporting ? 'loading' : ''}`} 
            onClick={exportStrategy}
            disabled={isExporting}
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Export ZIP'}
          </button>
        </div>

        <div className="nav-right mobile-actions">
           <button className="icon-btn" onClick={undo} disabled={history.length === 0}>
             <RotateCcw size={20} />
           </button>
           <button className="icon-btn premium" onClick={exportStrategy} disabled={isExporting}>
             <Download size={20} />
           </button>
        </div>
      </header>

      <div className="main-layout">
        <aside className={`sidebar glass-panel ${isMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-tabs">
            <SidebarItem 
              icon={Trophy} 
              label="Draft" 
              active={activeTab === 'draft'} 
              onClick={() => setActiveTab('draft')} 
            />
            <SidebarItem 
              icon={UserPlus} 
              label="Quick Teams" 
              active={activeTab === 'teams'} 
              onClick={() => setActiveTab('teams')} 
            />
          </div>
          
          <div className="sidebar-content">
            <AnimatePresence mode="wait">
              {activeTab === 'teams' && (
                <motion.div 
                  key="teams" 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <QuickSelect 
                    blueTeam={blueTeam} 
                    redTeam={redTeam} 
                    onAddHero={handleAddHero} 
                    onRemoveHero={handleRemoveHero}
                    onSwapTeam={handleSwapTeam}
                  />
                </motion.div>
              )}
              
              {activeTab === 'draft' && (
                <motion.div 
                  key="draft" 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <DraftSimulator 
                    draftState={{ ...draftData, phase: currentDraftStep.phase, turn: currentDraftStep.team }} 
                    onDraftAction={handleDraftAction} 
                    onResetDraft={resetDraft} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <main className="content-area">
          {/* Tools Toolbar Strip */}
          <div className="toolbar-strip">
            <div className="tool-main-actions">
              <button 
                className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} 
                onClick={() => setActiveTool('select')}
                title="Select Mode"
              >
                <MousePointer2 size={18} />
                <span>Select</span>
              </button>
              <button 
                className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`} 
                onClick={() => setActiveTool('draw')}
                title="Draw Mode"
              >
                <Pencil size={18} />
                <span>Draw</span>
              </button>
              <button 
                className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} 
                onClick={() => setActiveTool('eraser')}
                title="Eraser Mode"
              >
                <Eraser size={18} />
                <span>Eraser</span>
              </button>
            </div>

            <AnimatePresence>
              {(activeTool === 'draw' || activeTool === 'eraser') && (
                <motion.div 
                  className="tool-options-tray"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div className="color-divider" />
                  <div className="tray-label">Size</div>
                  <div className="size-selector">
                    {[4, 10, 20].map(size => (
                      <button
                        key={size}
                        className={`size-btn ${brushSize === size ? 'active' : ''}`}
                        onClick={() => setBrushSize(size)}
                      >
                        <div className="size-dot" style={{ width: size/1.5, height: size/1.5 }} />
                      </button>
                    ))}
                  </div>
                  {activeTool === 'draw' && (
                    <>
                      <div className="color-divider" />
                      <div className="tray-label">Color</div>
                      <div className="color-picker-tray">
                        {['#3a86ff', '#ff3a3a', '#ffd43a', '#ffffff', '#4cc9f0'].map(color => (
                          <button
                            key={color}
                            className={`color-dot ${drawColor === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setDrawColor(color)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Map Canvas fills remaining space */}
          <div className="canvas-wrapper" ref={mapContainerRef}>
            <MapCanvas 
              mapImage={mapImage} 
              placedHeroes={currentFrame.heroes}
              onHeroMove={(id, pos) => {
                const newHeroes = currentFrame.heroes.map(h => h.id === id ? { ...h, ...pos } : h);
                updateFrameData(newHeroes, null);
              }}
              onHeroRemove={(id) => {
                handleHeroRemove(id);
              }}
              activeTool={activeTool}
              drawColor={drawColor}
              brushSize={brushSize}
              paths={currentFrame.ink}
              setPaths={(newInk) => updateFrameData(null, newInk)}
              saveHistory={saveToHistory}
            />
          </div>

          {/* Timeline Strip */}
          <div className="timeline-container">
            <div className="timeline-scroll">
              {frames.map((frame, index) => (
                <motion.div 
                  key={frame.id} 
                  className={`timeline-frame ${activeFrameIndex === index ? 'active' : ''}`}
                  onClick={() => setActiveFrameIndex(index)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="frame-preview-box">
                    <img src={mapImage} alt="" className="frame-mini-map" />
                    <div className="frame-num-badge">{index + 1}</div>
                    {frame.heroes.length > 0 && <div className="frame-content-indicator" title={`${frame.heroes.length} Heroes`} />}
                  </div>
                  <input 
                    className="frame-name-input"
                    value={frame.name}
                    onChange={(e) => renameFrame(index, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {frames.length > 1 && (
                    <button className="frame-delete" onClick={(e) => deleteFrame(index, e)}>
                      <X size={10} />
                    </button>
                  )}
                  {activeFrameIndex === index && <motion.div layoutId="frame-glow" className="frame-active-glow" />}
                </motion.div>
              ))}
            </div>
            <button className="add-frame-btn" onClick={addFrame}>
              <Plus size={20} />
              <span>Add Frame</span>
            </button>
          </div>
        </main>
      </div>
      
      {/* Mobile Overlay for sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
