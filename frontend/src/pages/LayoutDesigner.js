import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { fetchEventById } from '../store/eventSlice';
import layoutAPI from '../utils/api/layoutAPI';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import LoadingSpinner from '../components/LoadingSpinner';
import DraggableItem from '../components/layout/DraggableItem';
import DropZone from '../components/layout/DropZone';
import LayoutSidebar from '../components/layout/LayoutSidebar';

const LayoutDesigner = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentEvent, isLoading } = useSelector((state) => state.events);
  
  const [layoutElements, setLayoutElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [layoutTitle, setLayoutTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);

  useEffect(() => {
    if (id) {
      const numericId = parseInt(id);
      if (!isNaN(numericId) && numericId > 0) {
        dispatch(fetchEventById(numericId));
        loadLayouts();
      } else {
        // Invalid ID, navigate back to dashboard
        navigate('/dashboard');
      }
    }
  }, [dispatch, id, navigate]);

  const loadLayouts = async () => {
    try {
      const layouts = await layoutAPI.getLayouts(id);
      setSavedLayouts(layouts);
    } catch (error) {
      console.error('Error loading layouts:', error);
    }
  };

  const handleDrop = useCallback((item, position) => {
    const newElement = {
      id: Date.now(),
      type: item.type,
      x: position.x,
      y: position.y,
      width: item.defaultWidth || 100,
      height: item.defaultHeight || 100,
      label: item.label,
      color: item.color || '#3b82f6',
    };
    
    setLayoutElements(prev => [...prev, newElement]);
  }, []);

  const updateElement = useCallback((id, updates) => {
    setLayoutElements(prev => 
      prev.map(element => 
        element.id === id ? { ...element, ...updates } : element
      )
    );
  }, []);

  const deleteElement = useCallback((id) => {
    setLayoutElements(prev => prev.filter(element => element.id !== id));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [selectedElement]);

  const saveLayout = async () => {
    if (!layoutTitle.trim()) {
      alert('Please enter a layout title');
      return;
    }

    setIsSaving(true);
    try {
      const layoutData = {
        title: layoutTitle,
        event_id: parseInt(id),
        elements: layoutElements,
      };
      
      await layoutAPI.createLayout(layoutData);
      alert('Layout saved successfully!');
      setLayoutTitle('');
      loadLayouts();
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Failed to save layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadLayout = async (layoutId) => {
    try {
      const layout = await layoutAPI.getLayoutById(layoutId);
      setLayoutElements(layout.elements || []);
      setLayoutTitle(layout.title);
    } catch (error) {
      console.error('Error loading layout:', error);
      alert('Failed to load layout');
    }
  };

  const exportToPNG = async () => {
    const canvas = document.querySelector('.drop-zone');
    if (!canvas) return;

    try {
      const canvasImage = await html2canvas(canvas, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `${currentEvent?.title || 'layout'}-layout.png`;
      link.href = canvasImage.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export PNG');
    }
  };

  const exportToPDF = async () => {
    const canvas = document.querySelector('.drop-zone');
    if (!canvas) return;

    try {
      const canvasImage = await html2canvas(canvas, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const imgData = canvasImage.toDataURL('image/png');
      const pdf = new jsPDF('landscape');
      const imgWidth = 280;
      const imgHeight = (canvasImage.height * imgWidth) / canvasImage.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${currentEvent?.title || 'layout'}-layout.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const clearLayout = () => {
    if (window.confirm('Are you sure you want to clear the entire layout?')) {
      setLayoutElements([]);
      setSelectedElement(null);
    }
  };

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
    <DndProvider backend={HTML5Backend}>
      <div className="layout-designer">
        {/* Toolbar */}
        <div className="layout-toolbar">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="layout-content">
          {/* Sidebar */}
          <LayoutSidebar 
            savedLayouts={savedLayouts}
            onLoadLayout={loadLayout}
            selectedElement={selectedElement}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
          />

          {/* Canvas */}
          <div className="layout-canvas">
            <DropZone 
              elements={layoutElements}
              onDrop={handleDrop}
              onSelectElement={setSelectedElement}
              selectedElement={selectedElement}
              onUpdateElement={updateElement}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

const styles = {
  container: {
    padding: '2rem',
    textAlign: 'center',
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
};

export default LayoutDesigner;