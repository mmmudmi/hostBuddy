import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import LayoutElement from './LayoutElement';

const DropZone = ({ 
  elements, 
  onDrop, 
  onSelectElement, 
  selectedElement, 
  onUpdateElement 
}) => {
  const dropRef = useRef(null);
  
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'layout-element',
    drop: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (dropResult) return;
      
      const offset = monitor.getClientOffset();
      const dropZoneRect = dropRef.current.getBoundingClientRect();
      
      const position = {
        x: offset.x - dropZoneRect.left - (item.defaultWidth / 2),
        y: offset.y - dropZoneRect.top - (item.defaultHeight / 2),
      };
      
      onDrop(item, position);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  drop(dropRef);

  return (
    <div 
      ref={dropRef}
      className="drop-zone"
      style={{
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : 'white',
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '600px',
      }}
    >
      {elements.map((element) => (
        <LayoutElement
          key={element.id}
          element={element}
          isSelected={selectedElement?.id === element.id}
          onSelect={() => onSelectElement(element)}
          onUpdate={(updates) => onUpdateElement(element.id, updates)}
        />
      ))}
      
      {elements.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎨</div>
          <h3>Start designing your layout</h3>
          <p>Drag elements from the sidebar to create your event layout</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
};

export default DropZone;