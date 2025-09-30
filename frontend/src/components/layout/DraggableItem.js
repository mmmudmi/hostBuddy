import React from 'react';
import { useDrag } from 'react-dnd';

const DraggableItem = ({ type, label, icon, defaultWidth = 100, defaultHeight = 100, color = '#3b82f6' }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'layout-element',
    item: { type, label, defaultWidth, defaultHeight, color },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className="drag-item"
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div style={styles.itemContent}>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.label}>{label}</span>
      </div>
    </div>
  );
};

const styles = {
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  icon: {
    fontSize: '1.2rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
  },
};

export default DraggableItem;