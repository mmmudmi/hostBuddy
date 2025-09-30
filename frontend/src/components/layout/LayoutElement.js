import React, { useState, useRef, useEffect } from 'react';

const LayoutElement = ({ element, isSelected, onSelect, onUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const elementRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) {
      handleResizeStart(e);
    } else {
      handleDragStart(e);
    }
    onSelect();
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - element.x,
      y: e.clientY - element.y,
    });
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = Math.max(0, e.clientX - dragStart.x);
      const newY = Math.max(0, e.clientY - dragStart.y);
      onUpdate({ x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(50, resizeStart.width + deltaX);
      const newHeight = Math.max(50, resizeStart.height + deltaY);
      onUpdate({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const elementStyle = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    backgroundColor: element.color || '#3b82f6',
    border: isSelected ? '2px solid #dc2626' : '2px solid transparent',
    borderRadius: '4px',
    cursor: isDragging ? 'grabbing' : 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: 'white',
    fontWeight: '600',
    userSelect: 'none',
    opacity: element.type === 'stage' ? 0.8 : 0.9,
  };

  return (
    <div
      ref={elementRef}
      style={elementStyle}
      onMouseDown={handleMouseDown}
      className="layout-element"
    >
      {element.label}
      
      {isSelected && (
        <>
          <div
            className="resize-handle"
            style={styles.resizeHandle}
            onMouseDown={handleResizeStart}
          />
          <div style={styles.elementInfo}>
            {element.width} × {element.height}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  resizeHandle: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: '12px',
    height: '12px',
    backgroundColor: '#dc2626',
    cursor: 'se-resize',
    border: '2px solid white',
    borderRadius: '2px',
  },
  elementInfo: {
    position: 'absolute',
    top: '-25px',
    left: '0',
    backgroundColor: '#1f2937',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    whiteSpace: 'nowrap',
  },
};

export default LayoutElement;