import React from 'react';
import DraggableItem from './DraggableItem';

const LayoutSidebar = ({ 
  savedLayouts, 
  onLoadLayout, 
  selectedElement, 
  onUpdateElement, 
  onDeleteElement 
}) => {
  const layoutElements = [
    { type: 'table', label: 'Round Table', icon: '⭕', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
    { type: 'table', label: 'Square Table', icon: '⬜', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
    { type: 'table', label: 'Long Table', icon: '⬛', defaultWidth: 120, defaultHeight: 60, color: '#8b5cf6' },
    { type: 'chair', label: 'Chair', icon: '🪑', defaultWidth: 30, defaultHeight: 30, color: '#f59e0b' },
    { type: 'stage', label: 'Stage', icon: '🎭', defaultWidth: 200, defaultHeight: 100, color: '#ef4444' },
    { type: 'bar', label: 'Bar Counter', icon: '🍷', defaultWidth: 150, defaultHeight: 40, color: '#06b6d4' },
    { type: 'dj', label: 'DJ Booth', icon: '🎵', defaultWidth: 100, defaultHeight: 80, color: '#10b981' },
    { type: 'entrance', label: 'Entrance', icon: '🚪', defaultWidth: 60, defaultHeight: 20, color: '#6b7280' },
    { type: 'restroom', label: 'Restroom', icon: '🚻', defaultWidth: 60, defaultHeight: 60, color: '#84cc16' },
    { type: 'buffet', label: 'Buffet', icon: '🍽️', defaultWidth: 120, defaultHeight: 40, color: '#f97316' },
  ];

  return (
    <div className="layout-sidebar">
      {/* Layout Elements */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Layout Elements</h3>
        <div style={styles.elementsGrid}>
          {layoutElements.map((element, index) => (
            <DraggableItem
              key={index}
              type={element.type}
              label={element.label}
              icon={element.icon}
              defaultWidth={element.defaultWidth}
              defaultHeight={element.defaultHeight}
              color={element.color}
            />
          ))}
        </div>
      </div>

      {/* Element Properties */}
      {selectedElement && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Element Properties</h3>
          <div style={styles.propertiesForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Width:</label>
              <input
                type="number"
                value={selectedElement.width}
                onChange={(e) => onUpdateElement({ width: parseInt(e.target.value) })}
                style={styles.input}
                min="10"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height:</label>
              <input
                type="number"
                value={selectedElement.height}
                onChange={(e) => onUpdateElement({ height: parseInt(e.target.value) })}
                style={styles.input}
                min="10"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>X Position:</label>
              <input
                type="number"
                value={selectedElement.x}
                onChange={(e) => onUpdateElement({ x: parseInt(e.target.value) })}
                style={styles.input}
                min="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Y Position:</label>
              <input
                type="number"
                value={selectedElement.y}
                onChange={(e) => onUpdateElement({ y: parseInt(e.target.value) })}
                style={styles.input}
                min="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color:</label>
              <input
                type="color"
                value={selectedElement.color}
                onChange={(e) => onUpdateElement({ color: e.target.value })}
                style={styles.colorInput}
              />
            </div>
            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              style={styles.deleteButton}
            >
              Delete Element
            </button>
          </div>
        </div>
      )}

      {/* Saved Layouts */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Saved Layouts</h3>
        {savedLayouts.length === 0 ? (
          <p style={styles.emptyText}>No saved layouts</p>
        ) : (
          <div style={styles.layoutsList}>
            {savedLayouts.map((layout) => (
              <div key={layout.id} style={styles.layoutItem}>
                <span style={styles.layoutTitle}>{layout.title}</span>
                <button
                  onClick={() => onLoadLayout(layout.id)}
                  style={styles.loadButton}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  section: {
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  elementsGrid: {
    display: 'grid',
    gap: '0.5rem',
  },
  propertiesForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
  },
  colorInput: {
    width: '50px',
    height: '30px',
    padding: '0',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  layoutsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  layoutItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  layoutTitle: {
    fontSize: '0.875rem',
    color: '#1f2937',
    flex: 1,
  },
  loadButton: {
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
};

export default LayoutSidebar;