
import React, { useState, useEffect, useRef } from 'react';
import { Frame, ToolType, CanvasImage } from './types';
import { Timeline } from './components/Timeline';
import { CanvasEditor } from './components/CanvasEditor';
import { exportToVideo } from './services/exportService';
import { generateAnimationIdea } from './services/geminiService';
import { 
  Pencil, Eraser, Move, Image as ImageIcon, Download, 
  Layers, Wand2, Loader2, Play 
} from 'lucide-react';

// Default initial state
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const INITIAL_FRAME: Frame = {
  id: 'frame-1',
  images: [],
  paths: [],
  backgroundColor: '#ffffff'
};

const App: React.FC = () => {
  const [frames, setFrames] = useState<Frame[]>([INITIAL_FRAME]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.MOVE);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [onionSkin, setOnionSkin] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Gemini State
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [generatedIdea, setGeneratedIdea] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);

  // Refs for handling intervals
  const playInterval = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playback Logic
  useEffect(() => {
    if (isPlaying) {
      playInterval.current = window.setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      }, 1000 / fps);
    } else {
      if (playInterval.current) {
        clearInterval(playInterval.current);
        playInterval.current = null;
      }
    }
    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [isPlaying, fps, frames.length]);

  // Frame Management
  const addFrame = () => {
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      images: [], // Start blank
      paths: [],
      backgroundColor: '#ffffff'
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const duplicateFrame = (index: number) => {
    const frameToCopy = frames[index];
    const newFrame: Frame = {
      ...JSON.parse(JSON.stringify(frameToCopy)),
      id: `frame-${Date.now()}`
    };
    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(index + 1);
  };

  const deleteFrame = (index: number) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== index);
    setFrames(newFrames);
    if (currentFrameIndex >= newFrames.length) {
      setCurrentFrameIndex(newFrames.length - 1);
    }
  };

  const updateCurrentFrame = (updatedFrame: Frame) => {
    const newFrames = [...frames];
    newFrames[currentFrameIndex] = updatedFrame;
    setFrames(newFrames);
  };

  // Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Scale down if too big
        let width = img.width;
        let height = img.height;
        const maxSize = 300;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        const newImage: CanvasImage = {
          id: `img-${Date.now()}`,
          src: event.target?.result as string,
          x: (CANVAS_WIDTH - width) / 2,
          y: (CANVAS_HEIGHT - height) / 2,
          width,
          height,
          rotation: 0
        };

        const currentFrame = frames[currentFrameIndex];
        updateCurrentFrame({
          ...currentFrame,
          images: [...currentFrame.images, newImage]
        });
        
        setActiveTool(ToolType.MOVE); // Switch to move tool automatically
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export
  const handleExport = async () => {
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);

    try {
      const blob = await exportToVideo(frames, CANVAS_WIDTH, CANVAS_HEIGHT, fps, (p) => setExportProgress(p));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `animacion-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Error al exportar el video.");
    } finally {
      setIsExporting(false);
    }
  };

  // AI Idea Generation
  const handleGenerateIdea = async () => {
    if (!ideaPrompt.trim()) return;
    setIsGeneratingIdea(true);
    const result = await generateAnimationIdea(ideaPrompt);
    setGeneratedIdea(result);
    setIsGeneratingIdea(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
             <Play size={16} fill="white" className="ml-1" />
           </div>
           <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
             FlipaMaker
           </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowIdeaModal(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors border border-gray-700"
          >
            <Wand2 size={16} className="text-purple-400" />
            <span>Asistente IA</span>
          </button>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{isExporting ? `Exportando ${exportProgress}%` : 'Exportar Video'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Toolbar Left */}
        <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4 z-10">
          <ToolButton 
            active={activeTool === ToolType.MOVE} 
            icon={<Move size={20} />} 
            label="Mover"
            onClick={() => setActiveTool(ToolType.MOVE)} 
          />
          <ToolButton 
            active={activeTool === ToolType.PEN} 
            icon={<Pencil size={20} />} 
            label="Dibujar"
            onClick={() => setActiveTool(ToolType.PEN)} 
          />
          <ToolButton 
            active={activeTool === ToolType.ERASER} 
            icon={<Eraser size={20} />} 
            label="Borrar"
            onClick={() => setActiveTool(ToolType.ERASER)} 
          />
          
          <div className="w-8 h-px bg-gray-700 my-2"></div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all group relative"
          >
            <ImageIcon size={20} />
            <span className="absolute left-14 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-gray-700 z-50">
               Agregar Img
            </span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />

          <div className="w-8 h-px bg-gray-700 my-2"></div>
          
          {/* Properties Panel (Mini) */}
          {(activeTool === ToolType.PEN || activeTool === ToolType.ERASER) && (
            <div className="flex flex-col space-y-3 items-center animate-fade-in">
              <input 
                type="color" 
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-600 cursor-pointer"
              />
              <input 
                type="range" 
                min="1" max="20" 
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-12 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer transform -rotate-90 mt-4"
              />
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-950 relative flex flex-col items-center justify-center p-8 overflow-hidden">
             
            {/* Onion Skin Toggle */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setOnionSkin(!onionSkin)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${onionSkin ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                <Layers size={14} />
                <span>Papel Cebolla</span>
              </button>
            </div>

            <div className="border border-gray-700 shadow-2xl">
              <CanvasEditor 
                frame={frames[currentFrameIndex]}
                prevFrame={currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : undefined}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                activeTool={activeTool}
                brushColor={brushColor}
                brushSize={brushSize}
                onionSkin={onionSkin}
                onUpdateFrame={updateCurrentFrame}
              />
            </div>
        </div>
      </div>

      {/* Timeline Bottom */}
      <Timeline 
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        fps={fps}
        isPlaying={isPlaying}
        onSelectFrame={setCurrentFrameIndex}
        onAddFrame={addFrame}
        onDuplicateFrame={duplicateFrame}
        onDeleteFrame={deleteFrame}
        onFpsChange={setFps}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* AI Modal */}
      {showIdeaModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                   <Wand2 className="text-purple-400" /> Asistente Creativo
                 </h2>
                 <button onClick={() => setShowIdeaModal(false)} className="text-gray-400 hover:text-white">&times;</button>
              </div>
              
              <p className="text-gray-400 text-sm mb-4">
                ¿Sin inspiración? Pídele a Gemini una idea para tu próxima animación.
              </p>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={ideaPrompt}
                  onChange={(e) => setIdeaPrompt(e.target.value)}
                  placeholder="Ej: un gato astronauta, una flor creciendo..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                
                <button 
                  onClick={handleGenerateIdea}
                  disabled={isGeneratingIdea || !ideaPrompt}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGeneratingIdea ? <Loader2 className="animate-spin" /> : 'Generar Idea'}
                </button>
              </div>

              {generatedIdea && (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-fade-in">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Resultado:</h3>
                  <p className="text-gray-200 italic">"{generatedIdea}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent for buttons
const ToolButton: React.FC<{ active: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all group relative ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
  >
    {icon}
    <span className="absolute left-14 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-gray-700 z-50 text-white">
      {label}
    </span>
  </button>
);

export default App;
