import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

const MapCanvas = ({ 
  mapImage, 
  placedHeroes, 
  onHeroMove, 
  onHeroRemove, 
  activeTool, 
  drawColor, 
  brushSize,
  paths,
  setPaths,
  saveHistory
}) => {
  const [scale, setScale] = useState(0.8);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Initialize canvas size based on map image
  useEffect(() => {
    if (mapImage) {
      const img = new Image();
      img.src = mapImage;
      img.onload = () => {
        if (canvasRef.current) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          redrawCanvas();
        }
      };
    }
  }, [mapImage]);

  // Redraw canvas whenever paths change
  useEffect(() => {
    redrawCanvas();
  }, [paths]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    paths.forEach(path => {
      ctx.beginPath();
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (path.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = path.color;
      }

      if (path.points.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.2, scale + delta), 3);
    setScale(newScale);
  };

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e) => {
    if (activeTool === 'select') return;
    saveHistory(); // Save history BEFORE starting a new stroke
    setIsDrawing(true);
    const pos = getMousePos(e);
    setPaths([...paths, { 
      points: [pos], 
      color: drawColor, 
      size: brushSize / scale,
      isEraser: activeTool === 'eraser' 
    }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || activeTool === 'select') return;
    const pos = getMousePos(e);
    const lastPath = paths[paths.length - 1];
    const newLastPath = { ...lastPath, points: [...lastPath.points, pos] };
    setPaths([...paths.slice(0, -1), newLastPath]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div 
      className="map-canvas-container" 
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: activeTool === 'select' ? 'grab' : 'crosshair',
        position: 'relative',
        background: '#050507',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <motion.div
        drag={activeTool === 'select'}
        dragMomentum={false}
        dragElastic={0}
        style={{ x, y, scale, cursor: activeTool === 'select' ? 'grabbing' : 'inherit', position: 'relative' }}
      >
        <div ref={mapRef} style={{ position: 'relative' }}>
          {mapImage && (
            <img 
              src={mapImage} 
              alt="HOK Map" 
              style={{ 
                maxWidth: 'none', 
                pointerEvents: 'none',
                userSelect: 'none',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                display: 'block'
              }} 
            />
          )}

          {/* Drawing Layer (Canvas) */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 5
            }}
          />

          {/* Placed Heroes Layer */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <AnimatePresence>
              {placedHeroes.map((heroInstance) => (
                <HeroIcon 
                  key={heroInstance.id}
                  hero={heroInstance}
                  mapScale={scale}
                  zIndex={10}
                  onRemove={onHeroRemove}
                  onMove={onHeroMove}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="canvas-controls glass-panel">
        <button onClick={() => { saveHistory(); setPaths([]); }} title="Clear Drawing">Clear Ink</button>
        <div className="control-divider" />
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))}>+</button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))}>-</button>
        <button onClick={() => { x.set(0); y.set(0); setScale(0.8); }}>Reset View</button>
      </div>
    </div>
  );
};

const HeroIcon = ({ hero, mapScale, zIndex, onRemove, onMove }) => {
  const hX = useMotionValue(0);
  const hY = useMotionValue(0);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1 / mapScale,
        opacity: 1,
      }}
      exit={{ scale: 0, opacity: 0 }}
      style={{
        position: 'absolute',
        left: hero.x,
        top: hero.y,
        width: 48,
        height: 48,
        zIndex: zIndex,
        marginLeft: -24,
        marginTop: -24,
        pointerEvents: 'auto'
      }}
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        style={{ x: hX, y: hY, width: '100%', height: '100%' }}
        onDragEnd={(e, info) => {
          const finalX = hero.x + (info.offset.x / mapScale);
          const finalY = hero.y + (info.offset.y / mapScale);
          hX.set(0);
          hY.set(0);
          onMove(hero.id, { x: finalX, y: finalY });
        }}
        onClick={(e) => {
          if (e.shiftKey) onRemove(hero.id);
        }}
      >
        <img 
          src={`/assets/heroes/${hero.image}`}
          alt={hero.name}
          draggable="false"
          className={`hero-map-avatar ${hero.team || ''}`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid var(--accent-gold)',
            boxShadow: '0 0 15px rgba(212, 175, 55, 0.6)',
            background: '#000',
            pointerEvents: 'none'
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default MapCanvas;
