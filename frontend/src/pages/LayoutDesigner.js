import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import { fetchEventById } from '../store/eventSlice';
import layoutAPI from '../utils/api/layoutAPI';
import jsPDF from 'jspdf';
import LoadingSpinner from '../components/LoadingSpinner';

const LayoutDesigner = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentEvent, isLoading } = useSelector((state) => state.events);
  
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [layoutElements, setLayoutElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [layoutTitle, setLayoutTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);

  // Layout elements available for adding to canvas
  const elementTypes = [
    { type: 'round', label: 'Round', icon: '⭕', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
    { type: 'square', label: 'Square', icon: '⬜', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
  ];

  const loadLayouts = useCallback(async () => {
    try {
      // Try to load from backend first
      const layouts = await layoutAPI.getLayouts(id);
      setSavedLayouts(layouts);
    } catch (error) {
      console.warn('Backend unavailable, loading from localStorage:', error);
      // Fallback to localStorage
      const savedLayouts = JSON.parse(localStorage.getItem('layouts') || '[]');
      const eventLayouts = savedLayouts.filter(layout => layout.event_id === parseInt(id));
      setSavedLayouts(eventLayouts);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      const numericId = parseInt(id);
      if (!isNaN(numericId) && numericId > 0) {
        dispatch(fetchEventById(numericId));
        loadLayouts();
      } else {
        navigate('/dashboard');
      }
    }
  }, [dispatch, id, navigate, loadLayouts]);

  const addElement = (elementType) => {
    const newElement = {
      id: Date.now().toString(),
      type: elementType.type,
      x: 100,
      y: 100,
      width: elementType.defaultWidth,
      height: elementType.defaultHeight,
      color: elementType.color,
      label: elementType.label,
      rotation: 0,
    };
    
    setLayoutElements(prev => [...prev, newElement]);
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleDeselect = () => {
    setSelectedId(null);
  };

  const updateElement = useCallback((id, updates) => {
    setLayoutElements(prev => 
      prev.map(element => 
        element.id === id ? { ...element, ...updates } : element
      )
    );
  }, []);

  const deleteElement = useCallback(() => {
    if (selectedId) {
      setLayoutElements(prev => prev.filter(element => element.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  const saveLayout = async () => {
    if (!layoutTitle.trim()) {
      alert('Please enter a layout title');
      return;
    }

    // Check if a layout with the same name already exists
    const existingLayout = savedLayouts.find(layout => 
      layout.title.trim().toLowerCase() === layoutTitle.trim().toLowerCase()
    );

    setIsSaving(true);
    try {
      const layoutData = {
        title: layoutTitle,
        event_id: parseInt(id),
        elements: layoutElements,
      };
      
      // Try to save to backend, fallback to localStorage if backend is unavailable
      try {
        if (existingLayout) {
          // Update existing layout
          await layoutAPI.updateLayout(existingLayout.id, layoutData);
          alert('Layout updated successfully!');
        } else {
          // Create new layout
          await layoutAPI.createLayout(layoutData);
          alert('Layout saved successfully!');
        }
      } catch (apiError) {
        console.warn('Backend unavailable, saving to localStorage:', apiError);
        // Save to localStorage as fallback
        const savedLayouts = JSON.parse(localStorage.getItem('layouts') || '[]');
        
        if (existingLayout) {
          // Update existing layout in localStorage
          const updatedLayouts = savedLayouts.map(layout => 
            layout.id === existingLayout.id 
              ? { ...layout, ...layoutData, updated_at: new Date().toISOString() }
              : layout
          );
          localStorage.setItem('layouts', JSON.stringify(updatedLayouts));
          alert('Layout updated locally (backend unavailable)');
        } else {
          // Create new layout in localStorage
          const newLayout = {
            id: Date.now(),
            ...layoutData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          savedLayouts.push(newLayout);
          localStorage.setItem('layouts', JSON.stringify(savedLayouts));
          alert('Layout saved locally (backend unavailable)');
        }
      }
      
      setLayoutTitle('');
      loadLayouts();
    } catch (error) {
      console.error('Error saving layout:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error occurred';
      alert(`Failed to save layout: ${errorMessage}. Please check if the backend server is running.`);
    } finally {
      setIsSaving(false);
    }
  };

  const loadLayout = async (layoutId) => {
    try {
      // Try to load from backend first
      const layout = await layoutAPI.getLayoutById(layoutId);
      setLayoutElements(layout.elements || []);
      setLayoutTitle(layout.title);
      setSelectedId(null);
    } catch (error) {
      console.warn('Backend unavailable, loading from localStorage:', error);
      // Fallback to localStorage
      const savedLayouts = JSON.parse(localStorage.getItem('layouts') || '[]');
      const layout = savedLayouts.find(l => l.id === layoutId);
      if (layout) {
        setLayoutElements(layout.elements || []);
        setLayoutTitle(layout.title);
        setSelectedId(null);
      } else {
        alert('Failed to load layout');
      }
    }
  };

  const deleteLayout = async (layoutId, layoutTitle) => {
    if (!window.confirm(`Are you sure you want to delete the layout "${layoutTitle}"?`)) {
      return;
    }

    try {
      // Try to delete from backend first
      await layoutAPI.deleteLayout(layoutId);
    } catch (error) {
      console.warn('Backend unavailable, deleting from localStorage:', error);
      // Fallback to localStorage
      const savedLayouts = JSON.parse(localStorage.getItem('layouts') || '[]');
      const updatedLayouts = savedLayouts.filter(l => l.id !== layoutId);
      localStorage.setItem('layouts', JSON.stringify(updatedLayouts));
      alert('Layout deleted locally (backend unavailable)');
    } finally {
      // Reload the layouts list
      loadLayouts();
    }
  };

  const newLayout = () => {
    if (layoutElements.length > 0 || layoutTitle.trim()) {
      if (!window.confirm('Are you sure you want to start a new layout? Any unsaved changes will be lost.')) {
        return;
      }
    }
    
    // Clear everything for a fresh start
    setLayoutElements([]);
    setLayoutTitle('');
    setSelectedId(null);
  };

  const exportToPNG = () => {
    if (stageRef.current) {
      // Save current selection
      const currentSelection = selectedId;
      
      // Hide grid background during export
      const layer = stageRef.current.getLayers()[0];
      const gridElements = layer.find('.grid-element');
      
      // Hide grid elements and clear transformer
      gridElements.forEach(element => element.visible(false));
      if (transformerRef.current) {
        transformerRef.current.nodes([]);
      }
      
      // Remove selection styling from all shapes
      const allShapes = layer.find('Circle, Rect, Text').filter(node => !gridElements.includes(node));
      allShapes.forEach(shape => {
        shape.stroke('transparent');
        shape.strokeWidth(0);
      });
      
      layer.batchDraw();
      
      // Calculate bounding box of all layout elements
      if (layoutElements.length === 0) {
        alert('No elements to export');
        // Restore everything
        gridElements.forEach(element => element.visible(true));
        layer.batchDraw();
        return;
      }
      
      const padding = 20; // Add some padding around the elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      layoutElements.forEach(element => {
        const left = element.x;
        const top = element.y;
        const right = element.x + (element.type === 'round' ? element.width : element.width);
        const bottom = element.y + (element.type === 'round' ? element.width : element.height);
        
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      });
      
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = maxX - minX + (2 * padding);
      const cropHeight = maxY - minY + (2 * padding);
      
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      });
      
      // Restore grid elements and selection styling
      gridElements.forEach(element => element.visible(true));
      
      // Restore selection styling if there was a selection
      if (currentSelection) {
        const selectedShape = layer.findOne(`#${currentSelection}`);
        if (selectedShape) {
          selectedShape.stroke('#0066cc');
          selectedShape.strokeWidth(2);
        }
      }
      
      layer.batchDraw();
      
      const link = document.createElement('a');
      link.download = `${currentEvent?.title || 'layout'}-layout.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const exportToPDF = () => {
    if (stageRef.current) {
      // Save current selection
      const currentSelection = selectedId;
      
      // Hide grid background during export
      const layer = stageRef.current.getLayers()[0];
      const gridElements = layer.find('.grid-element');
      
      // Hide grid elements and clear transformer
      gridElements.forEach(element => element.visible(false));
      if (transformerRef.current) {
        transformerRef.current.nodes([]);
      }
      
      // Remove selection styling from all shapes
      const allShapes = layer.find('Circle, Rect, Text').filter(node => !gridElements.includes(node));
      allShapes.forEach(shape => {
        shape.stroke('transparent');
        shape.strokeWidth(0);
      });
      
      layer.batchDraw();
      
      // Calculate bounding box of all layout elements
      if (layoutElements.length === 0) {
        alert('No elements to export');
        // Restore everything
        gridElements.forEach(element => element.visible(true));
        layer.batchDraw();
        return;
      }
      
      const padding = 20; // Add some padding around the elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      layoutElements.forEach(element => {
        const left = element.x;
        const top = element.y;
        const right = element.x + (element.type === 'round' ? element.width : element.width);
        const bottom = element.y + (element.type === 'round' ? element.width : element.height);
        
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      });
      
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = maxX - minX + (2 * padding);
      const cropHeight = maxY - minY + (2 * padding);
      
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      });
      
      // Restore grid elements and selection styling
      gridElements.forEach(element => element.visible(true));
      
      // Restore selection styling if there was a selection
      if (currentSelection) {
        const selectedShape = layer.findOne(`#${currentSelection}`);
        if (selectedShape) {
          selectedShape.stroke('#0066cc');
          selectedShape.strokeWidth(2);
        }
      }
      
      layer.batchDraw();
      
      const pdf = new jsPDF(cropWidth > cropHeight ? 'landscape' : 'portrait');
      
      // Calculate dimensions to fit the PDF page
      const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 10px margin on each side
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      const aspectRatio = cropWidth / cropHeight;
      
      let imgWidth, imgHeight;
      if (aspectRatio > pageWidth / pageHeight) {
        imgWidth = pageWidth;
        imgHeight = pageWidth / aspectRatio;
      } else {
        imgHeight = pageHeight;
        imgWidth = pageHeight * aspectRatio;
      }
      
      const centerX = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
      const centerY = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;
      
      pdf.addImage(dataURL, 'PNG', centerX, centerY, imgWidth, imgHeight);
      pdf.save(`${currentEvent?.title || 'layout'}-layout.pdf`);
    }
  };

  const clearLayout = () => {
    if (window.confirm('Are you sure you want to clear the entire layout?')) {
      setLayoutElements([]);
      setSelectedId(null);
    }
  };

  // Render shape based on type
  const renderShape = (element) => {
    const isSelected = element.id === selectedId;
    
    const handleDragEnd = (e) => {
      updateElement(element.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    };

    const handleTransformEnd = (e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      updateElement(element.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
      
      node.scaleX(1);
      node.scaleY(1);
    };

    const shapeProps = {
      key: element.id,
      id: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      fill: element.color,
      stroke: isSelected ? '#0066cc' : 'transparent',
      strokeWidth: isSelected ? 2 : 0,
      draggable: true,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      onClick: () => handleSelect(element.id),
      onTap: () => handleSelect(element.id),
      rotation: element.rotation || 0,
    };

    let shape;
    if (element.type === 'round') {
      shape = (
        <Circle
          {...shapeProps}
          radius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    } 
    else if (element.type === 'text') {
      shape = (
        <Text
          {...shapeProps}
          text={element.label}
          fontSize={16}
          fill="black"
          width={element.width}
          height={element.height}
        />
      );
    }
    else {
      shape = <Rect {...shapeProps} />;
    }

    return (
      <React.Fragment key={element.id}>
        {shape}
        <Text
          x={element.x + (element.type === 'round' ? -element.width/4 : element.width/2 - 20)}
          y={element.y + (element.type === 'round' ? -5 : element.height/2 - 5)}
          text={element.label}
          fontSize={12}
          fill="white"
          fontStyle="bold"
          align="center"
          listening={false}
        />
      </React.Fragment>
    );
  };

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentEvent) {
    return (
      <div style={styles.container}>
        <div className="container">
          <h2>Event not found</h2>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-designer">
      {/* Toolbar */}
      <div className="layout-toolbar" style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <Link to={`/events/${id}`} style={styles.backLink}>
            ← Back to Event
          </Link>
          <h2 style={styles.eventTitle}>
            {currentEvent.title} - Layout Designer
          </h2>
        </div>
        
        <div style={styles.toolbarRight}>
          <input
            type="text"
            placeholder="Layout title..."
            value={layoutTitle}
            onChange={(e) => setLayoutTitle(e.target.value)}
            style={styles.titleInput}
            autoComplete="off"
          />
          <button 
            onClick={saveLayout}
            disabled={isSaving}
            className="btn btn-primary btn-small"
          >
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
          <button 
            onClick={exportToPNG}
            className="btn btn-secondary btn-small"
          >
            Export PNG
          </button>
          <button 
            onClick={exportToPDF}
            className="btn btn-secondary btn-small"
          >
            Export PDF
          </button>
          <button 
            onClick={clearLayout}
            className="btn btn-danger btn-small"
          >
            Clear All
          </button>
          {selectedId && (
            <button 
              onClick={deleteElement}
              className="btn btn-danger btn-small"
            >
              Delete Selected
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="layout-content" style={styles.content}>
        {/* Sidebar */}
        <div className="layout-sidebar" style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <h3>Layout Elements</h3>
            <div style={styles.elementGrid}>
              {elementTypes.map((elementType, index) => (
                <div
                  key={index}
                  style={{...styles.elementItem, backgroundColor: elementType.color}}
                  onClick={() => addElement(elementType)}
                >
                  <span style={styles.elementIcon}>{elementType.icon}</span>
                  <span style={styles.elementLabel}>{elementType.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Layouts Section */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeader}>
              <h3>Saved Layouts</h3>
              <button
                onClick={newLayout}
                style={styles.newLayoutButton}
                title="Create new layout"
              >
                + New
              </button>
            </div>
            
            {savedLayouts.length > 0 && (
              <div style={styles.layoutList}>
                {savedLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    style={styles.layoutItem}
                  >
                    <span 
                      style={styles.layoutTitle}
                      onClick={() => loadLayout(layout.id)}
                    >
                      {layout.title}
                    </span>
                    <button
                      style={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayout(layout.id, layout.title);
                      }}
                      title="Delete layout"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {savedLayouts.length === 0 && (
              <div style={styles.emptyState}>
                <p>No saved layouts yet.</p>
                <p>Create your first layout!</p>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="layout-canvas" style={styles.canvas}>
          <Stage
            ref={stageRef}
            width={800}
            height={600}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                handleDeselect();
              }
            }}
            onTouchStart={(e) => {
              if (e.target === e.target.getStage()) {
                handleDeselect();
              }
            }}
          >
            <Layer>
              {/* Grid background */}
              {Array.from({ length: 40 }, (_, i) => (
                <React.Fragment key={`grid-${i}`}>
                  <Rect
                    name="grid-element"
                    x={i * 20}
                    y={0}
                    width={1}
                    height={600}
                    fill="#f0f0f0"
                    listening={false}
                  />
                  <Rect
                    name="grid-element"
                    x={0}
                    y={i * 15}
                    width={800}
                    height={1}
                    fill="#f0f0f0"
                    listening={false}
                  />
                </React.Fragment>
              ))}
              
              {/* Layout elements */}
              {layoutElements.map(renderShape)}
              
              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit resize
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    textAlign: 'center',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
  },
  eventTitle: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#1f2937',
  },
  titleInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '200px',
  },
  content: {
    display: 'flex',
    height: 'calc(100vh - 120px)',
  },
  sidebar: {
    width: '300px',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    padding: '1rem',
    overflowY: 'auto',
  },
  sidebarSection: {
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  newLayoutButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '0.9rem',
    padding: '1rem',
  },
  elementGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  elementItem: {
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
    transition: 'opacity 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  elementIcon: {
    fontSize: '1.5rem',
  },
  elementLabel: {
    fontSize: '0.75rem',
  },
  layoutList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  layoutItem: {
    padding: '0.75rem',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  layoutTitle: {
    cursor: 'pointer',
    flex: 1,
    fontSize: '0.9rem',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#fee2e2',
    },
  },
  canvas: {
    flex: 1,
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '1rem',
  },
};

export default LayoutDesigner;