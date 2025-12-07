
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Frame, ToolType, Point, CanvasImage } from '../types';

interface CanvasEditorProps {
  frame: Frame;
  prevFrame?: Frame; // For onion skinning
  width: number;
  height: number;
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  onionSkin: boolean;
  onUpdateFrame: (updatedFrame: Frame) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  frame,
  prevFrame,
  width,
  height,
  activeTool,
  brushColor,
  brushSize,
  onionSkin,
  onUpdateFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw Background
    ctx.fillStyle = frame.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Onion Skin (Previous Frame)
    if (onionSkin && prevFrame) {
      ctx.globalAlpha = 0.3;
      
      // Draw Images (Onion)
      prevFrame.images.forEach(img => drawImage(ctx, img));
      
      // Draw Paths (Onion)
      prevFrame.paths.forEach(path => drawPath(ctx, path));
      
      ctx.globalAlpha = 1.0;
    }

    // Current Frame Images
    frame.images.forEach(img => {
      drawImage(ctx, img);
      // Highlight selected/dragged image
      if (activeTool === ToolType.MOVE && draggedImageId === img.id) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(img.x, img.y, img.width, img.height);
      }
    });

    // Current Frame Paths
    frame.paths.forEach(path => drawPath(ctx, path));

  }, [frame, prevFrame, width, height, onionSkin, activeTool, draggedImageId]);

  // Helper to draw image
  const drawImage = (ctx: CanvasRenderingContext2D, imgData: CanvasImage) => {
    const img = new Image();
    img.src = imgData.src;
    // Note: In a real prod app, we'd preload these. 
    // For this strict rendering cycle, if it's not loaded, it might flicker once.
    if (img.complete) {
        ctx.save();
        ctx.translate(imgData.x + imgData.width / 2, imgData.y + imgData.height / 2);
        ctx.rotate((imgData.rotation * Math.PI) / 180);
        try {
            ctx.drawImage(img, -imgData.width / 2, -imgData.height / 2, imgData.width, imgData.height);
        } catch (e) {
            // Ignore render errors for broken images
        }
        ctx.restore();
    } else {
        img.onload = () => render(); // Re-render when loaded
    }
  };

  // Helper to draw path
  const drawPath = (ctx: CanvasRenderingContext2D, path: any) => {
    if (path.points.length < 2) return;
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  };

  useEffect(() => {
    render();
  }, [render]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Calculate scale factors if canvas is displayed at different size than intrinsic
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    const pos = getPointerPos(e);
    
    if (activeTool === ToolType.MOVE) {
        // Find clicked image (reverse to find top-most first)
        const clickedImage = [...frame.images].reverse().find(img => 
            pos.x >= img.x && pos.x <= img.x + img.width &&
            pos.y >= img.y && pos.y <= img.y + img.height
        );

        if (clickedImage) {
            setDraggedImageId(clickedImage.id);
            setDragOffset({ x: pos.x - clickedImage.x, y: pos.y - clickedImage.y });
            setIsDrawing(true);
        }
    } else {
        // Start Drawing
        setIsDrawing(true);
        const newPath = {
            color: activeTool === ToolType.ERASER ? (frame.backgroundColor || '#ffffff') : brushColor,
            width: activeTool === ToolType.ERASER ? brushSize * 2 : brushSize,
            points: [pos]
        };
        onUpdateFrame({
            ...frame,
            paths: [...frame.paths, newPath]
        });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPointerPos(e);

    if (activeTool === ToolType.MOVE && draggedImageId) {
        // Move Image
        const updatedImages = frame.images.map(img => {
            if (img.id === draggedImageId) {
                return { ...img, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
            }
            return img;
        });
        onUpdateFrame({ ...frame, images: updatedImages });
    } else if (activeTool !== ToolType.MOVE) {
        // Continue Drawing
        const paths = [...frame.paths];
        const currentPath = paths[paths.length - 1];
        currentPath.points.push(pos);
        onUpdateFrame({ ...frame, paths });
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setDraggedImageId(null);
  };

  return (
    <div className="relative shadow-2xl bg-gray-800 rounded-lg overflow-hidden" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="touch-none cursor-crosshair bg-white"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
};
