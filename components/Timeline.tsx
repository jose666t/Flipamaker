
import React from 'react';
import { Frame } from '../types';
import { Plus, Trash2, Copy, Play, Square } from 'lucide-react';

interface TimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onDuplicateFrame: (index: number) => void;
  onFpsChange: (fps: number) => void;
  onTogglePlay: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentFrameIndex,
  fps,
  isPlaying,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onFpsChange,
  onTogglePlay,
}) => {
  return (
    <div className="flex flex-col h-48 bg-gray-900 border-t border-gray-700 select-none">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-full ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white transition-colors`}
          >
            {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          
          <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-lg">
            <span className="text-xs text-gray-400 uppercase font-bold">Velocidad</span>
            <input
              type="range"
              min="1"
              max="24"
              value={fps}
              onChange={(e) => onFpsChange(Number(e.target.value))}
              className="w-24 h-1 bg-blue-500 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-mono text-white w-8 text-right">{fps} FPS</span>
          </div>
        </div>

        <div className="text-gray-400 text-sm">
          {currentFrameIndex + 1} / {frames.length}
        </div>
      </div>

      {/* Frames Strip */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex items-center space-x-3 custom-scrollbar">
        {frames.map((frame, idx) => (
          <div
            key={frame.id}
            onClick={() => onSelectFrame(idx)}
            className={`relative flex-shrink-0 w-24 h-24 bg-white rounded-lg cursor-pointer transition-all border-2 group ${
              idx === currentFrameIndex ? 'border-blue-500 shadow-lg shadow-blue-500/50 scale-105' : 'border-gray-600 hover:border-gray-400'
            }`}
          >
             {/* Thumbnail Preview */}
            <div className="w-full h-full overflow-hidden rounded-md flex items-center justify-center bg-gray-100">
                {frame.images.length > 0 ? (
                     <img src={frame.images[0].src} alt="frame" className="w-full h-full object-cover opacity-80" />
                ) : frame.paths.length > 0 ? (
                    <div className="text-gray-400 text-xs">Dibujo</div>
                ) : (
                    <div className="text-gray-300 text-xs">Vacío</div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
                    {idx + 1}
                </div>
            </div>

            {/* Frame Actions (Hover) */}
            <div className="absolute -top-3 -right-3 hidden group-hover:flex space-x-1">
               <button 
                onClick={(e) => { e.stopPropagation(); onDuplicateFrame(idx); }}
                className="p-1 bg-gray-700 text-white rounded-full hover:bg-blue-600"
                title="Duplicar"
               >
                 <Copy size={12} />
               </button>
               {frames.length > 1 && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteFrame(idx); }}
                  className="p-1 bg-gray-700 text-white rounded-full hover:bg-red-600"
                  title="Eliminar"
                 >
                   <Trash2 size={12} />
                 </button>
               )}
            </div>
          </div>
        ))}

        {/* Add Frame Button */}
        <button
          onClick={onAddFrame}
          className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-gray-400 transition-colors"
        >
          <Plus size={32} />
          <span className="text-xs mt-2">Nuevo</span>
        </button>
      </div>
    </div>
  );
};
