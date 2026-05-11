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
  X
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
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

function App() {
  const [activeTab, setActiveTab] = useState('teams');
  const [activeTool, setActiveTool] = useState('select');
  const [drawColor, setDrawColor] = useState('#3a86ff');
  const [brushSize, setBrushSize] = useState(4);
  const [mapImage, setMapImage] = useState('/assets/maps/Map.webp');
  
  // Frames & Timeline State
  const [frames, setFrames] = useState([
    { id: 1, name: 'Frame 1', heroes: [], ink: [] }
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
    setHistory([...history, snapshot]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setBlueTeam(lastState.blueTeam);
    setRedTeam(lastState.redTeam);
    setDraftData(lastState.draftData);
    setDraftStep(lastState.draftStep);
    setFrames(lastState.frames || [{ id: 1, name: 'Frame 1', heroes: [], ink: [] }]);
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
      
      // Update current frame's heroes to match roster (preserving x,y if they exist)
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
        // Wait for React to switch frame and render map
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mapContainerRef.current) {
          const dataUrl = await toPng(mapContainerRef.current, {
            backgroundColor: '#050507',
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
      // Blue team on far left, Red team on far right
      x: team === 'blue' ? 80 : 950, 
      y: 80 + (teamCount * 100) // Increased spacing to 100px
    };
    if (team === 'blue') setBlueTeam([...blueTeam, newHero]);
    else setRedTeam([...redTeam, newHero]);
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
    saveToHistory();
    setDraftData({ blueBans: [], redBans: [], bluePicks: [], redPicks: [] });
    setDraftStep(0);
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

  const handleHeroMove = (id, newPos) => {
    // We don't save movement to history to avoid bloating, 
    // but we could if needed for critical strategy steps.
    setPlacedHeroes(placedHeroes.map(h => 
      h.id === id ? { ...h, x: newPos.x, y: newPos.y } : h
    ));
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
    if (window.confirm('Clear everything?')) {
      saveToHistory();
      setBlueTeam([]);
      setRedTeam([]);
      resetDraft();
    }
  };

  const currentDraftStep = DRAFT_SEQUENCE[draftStep] || { phase: 'finished', team: 'none' };

  return (
    <div className="app-container">
      <nav className="navbar glass-panel">
        <div className="nav-left">
          <div className="logo"><span className="logo-gold">HOK</span> Strat Maker</div>
        </div>
        <div className="nav-right">
          <button className="nav-btn" onClick={undo} disabled={history.length === 0} style={{ opacity: history.length === 0 ? 0.5 : 1 }}>
            <RotateCcw size={18} /> Undo
          </button>
          <button className="nav-btn" onClick={clearAll}><Plus size={18} /> Reset</button>
          <button 
            className={`premium-button ${isExporting ? 'loading' : ''}`} 
            onClick={exportStrategy}
            disabled={isExporting}
          >
            {isExporting ? 'Generating ZIP...' : 'Export Strategy'}
          </button>
        </div>
      </nav>

      <div className="main-layout">
        <aside className="sidebar glass-panel">
          <div className="sidebar-section">
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
          
          <div className="sidebar-divider" />
          
          <div className="sidebar-content">
            <AnimatePresence mode="wait">
              {activeTab === 'teams' && (
                <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <motion.div key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          <div className="canvas-wrapper glass-panel" ref={mapContainerRef}>
            <MapCanvas 
              mapImage={mapImage} 
              placedHeroes={currentFrame.heroes}
              onHeroMove={(id, pos) => {
                const newHeroes = currentFrame.heroes.map(h => h.id === id ? { ...h, ...pos } : h);
                updateFrameData(newHeroes, null);
              }}
              onHeroRemove={(id) => {
                saveToHistory();
                handleHeroRemove(id);
              }}
              activeTool={activeTool}
              drawColor={drawColor}
              brushSize={brushSize}
              paths={currentFrame.ink}
              setPaths={(newInk) => updateFrameData(null, newInk)}
              saveHistory={saveToHistory}
            />
            
            {/* Floating Tools Toolbar */}
            <div className="floating-toolbar glass-panel">
              <div className="tool-main-actions">
                <button 
                  className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} 
                  onClick={() => setActiveTool('select')}
                  title="Select Mode"
                >
                  <MousePointer2 size={20} />
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`} 
                  onClick={() => setActiveTool('draw')}
                  title="Draw Mode"
                >
                  <Pencil size={20} />
                </button>
                <button 
                  className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`} 
                  onClick={() => setActiveTool('eraser')}
                  title="Eraser Mode"
                >
                  <Eraser size={20} />
                </button>
              </div>

              {(activeTool === 'draw' || activeTool === 'eraser') && (
                <motion.div 
                  className="tool-options-tray"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                >
                  <div className="color-divider" />
                  
                  {/* Size Selection */}
                  <div className="size-selector">
                    {[
                      { size: 4, iconSize: 8 },
                      { size: 10, iconSize: 14 },
                      { size: 20, iconSize: 20 }
                    ].map(s => (
                      <button
                        key={s.size}
                        className={`size-btn ${brushSize === s.size ? 'active' : ''}`}
                        onClick={() => setBrushSize(s.size)}
                        title={`Size ${s.size}`}
                      >
                        <Circle size={s.iconSize} fill="currentColor" />
                      </button>
                    ))}
                  </div>

                  {activeTool === 'draw' && (
                    <>
                      <div className="color-divider" />
                      <div className="color-picker-tray">
                        {[
                          { color: '#3a86ff', label: 'Blue' },
                          { color: '#ff3a3a', label: 'Red' },
                          { color: '#ffd43a', label: 'Yellow' },
                          { color: '#ffffff', label: 'White' },
                          { color: '#4cc9f0', label: 'Cyan' }
                        ].map(c => (
                          <button
                            key={c.color}
                            className={`color-dot ${drawColor === c.color ? 'active' : ''}`}
                            style={{ backgroundColor: c.color }}
                            onClick={() => setDrawColor(c.color)}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </div>

            {/* Timeline UI */}
            <div className="timeline-container glass-panel">
              <div className="timeline-scroll">
                {frames.map((frame, index) => (
                  <div 
                    key={frame.id} 
                    className={`timeline-frame ${activeFrameIndex === index ? 'active' : ''}`}
                    onClick={() => setActiveFrameIndex(index)}
                  >
                    <div className="frame-preview">
                      <div className="frame-num">{index + 1}</div>
                    </div>
                    <input 
                      className="frame-name-input"
                      value={frame.name}
                      onChange={(e) => renameFrame(index, e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent selecting frame when clicking input
                    />
                    {frames.length > 1 && (
                      <button className="frame-delete" onClick={(e) => deleteFrame(index, e)}>
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="add-frame-btn" onClick={addFrame}>
                <Plus size={16} /> Add Frame
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
