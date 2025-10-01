import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Stage, Layer, Rect, Circle, Text, Transformer, Ellipse, Line, RegularPolygon, Star, Arc, Group } from 'react-konva';
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
  const [selectedIds, setSelectedIds] = useState([]); // For multiple selection
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [tempGroupBounds, setTempGroupBounds] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  const [clipboardOperation, setClipboardOperation] = useState(null); // 'cut' or 'copy'
  const [layoutTitle, setLayoutTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Layout elements available for adding to canvas
  const elementTypes = [
    // Basic Shapes
    { type: 'round', label: 'Circle', icon: '⭕', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
    { type: 'square', label: 'Rectangle', icon: '⬜', defaultWidth: 100, defaultHeight: 60, color: '#8b5cf6' },
    { type: 'ellipse', label: 'Oval', icon: '⬭', defaultWidth: 120, defaultHeight: 60, color: '#10b981' },
    
    // Polygon Shapes
    { type: 'triangle', label: 'Triangle', icon: '🔺', defaultWidth: 80, defaultHeight: 80, color: '#f59e0b' },
    { type: 'hexagon', label: 'Hexagon', icon: '⬢', defaultWidth: 80, defaultHeight: 80, color: '#ef4444' },
    { type: 'pentagon', label: 'Pentagon', icon: '⬟', defaultWidth: 80, defaultHeight: 80, color: '#06b6d4' },
    { type: 'octagon', label: 'Octagon', icon: '⯄', defaultWidth: 80, defaultHeight: 80, color: '#8b5cf6' },
    
    // Special Shapes
    { type: 'star', label: 'Star', icon: '⭐', defaultWidth: 80, defaultHeight: 80, color: '#fbbf24' },
    { type: 'arc', label: 'Arc', icon: '◗', defaultWidth: 100, defaultHeight: 100, color: '#f97316' },
    
    // Lines and Dividers
    { type: 'line', label: 'Line', icon: '📏', defaultWidth: 100, defaultHeight: 2, color: '#374151' },
    
    // Text and Labels
    { type: 'text', label: 'Text', icon: '📝', defaultWidth: 100, defaultHeight: 30, color: '#1f2937' },
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
    
    // Add special properties for text elements
    if (elementType.type === 'text') {
      newElement.text = 'Sample Text';
    }
    
    setLayoutElements(prev => [...prev, newElement]);
    setHasUnsavedChanges(true);
  };

  const handleSelect = (id, event) => {
    const isShift = event?.shiftKey;
    
    if (isShift || isShiftHeld) {
      // Multi-select mode with temporary grouping
      setIsMultiSelect(true);
      setSelectedIds(prev => {
        let newSelection;
        if (prev.includes(id)) {
          // Remove from selection if already selected
          newSelection = prev.filter(selectedId => selectedId !== id);
          if (newSelection.length === 0) {
            setIsMultiSelect(false);
            setSelectedId(null);
            setTempGroupBounds(null);
          } else if (newSelection.length === 1) {
            setSelectedId(newSelection[0]);
            setIsMultiSelect(false);
            setTempGroupBounds(null);
          }
        } else {
          // Add to selection
          newSelection = [...prev, id];
        }
        
        // Update temporary group bounds
        if (newSelection.length > 1) {
          updateTempGroupBounds(newSelection);
        } else {
          setTempGroupBounds(null);
        }
        
        return newSelection;
      });
      setSelectedId(null); // Clear single selection in multi-select mode
    } else {
      // Single select mode
      setSelectedId(id);
      setSelectedIds([]);
      setIsMultiSelect(false);
      setTempGroupBounds(null);
    }
  };

  const handleDeselect = () => {
    setSelectedId(null);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setTempGroupBounds(null);
  };

  // Update temporary group bounds based on selected elements
  const updateTempGroupBounds = useCallback((selectedElementIds) => {
    if (selectedElementIds.length < 2) {
      setTempGroupBounds(null);
      return;
    }
    
    const selectedElements = layoutElements.filter(element => selectedElementIds.includes(element.id));
    if (selectedElements.length === 0) {
      setTempGroupBounds(null);
      return;
    }
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedElements.forEach(element => {
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, element.x + (element.width || 0));
      maxY = Math.max(maxY, element.y + (element.height || 0));
    });
    
    setTempGroupBounds({
      x: minX - 5, // Add padding
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10,
    });
  }, [layoutElements]);

  // Update temp group bounds when elements change position
  useEffect(() => {
    if (isMultiSelect && selectedIds.length > 1) {
      updateTempGroupBounds(selectedIds);
    }
  }, [layoutElements, isMultiSelect, selectedIds, updateTempGroupBounds]);

  const updateElement = useCallback((id, updates) => {
    setLayoutElements(prev => 
      prev.map(element => 
        element.id === id ? { ...element, ...updates } : element
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const deleteElement = useCallback(() => {
    if (isMultiSelect && selectedIds.length > 0) {
      // Delete multiple selected elements (temporary group)
      setLayoutElements(prev => prev.filter(element => !selectedIds.includes(element.id)));
      setSelectedIds([]);
      setIsMultiSelect(false);
      setTempGroupBounds(null);
      setHasUnsavedChanges(true);
    } else if (selectedId) {
      // Delete single selected element
      setLayoutElements(prev => prev.filter(element => element.id !== selectedId));
      setSelectedId(null);
      setHasUnsavedChanges(true);
    }
  }, [selectedId, selectedIds, isMultiSelect]);

  // Cut selected elements
  const cutElements = useCallback(() => {
    const elementsToCut = [];
    
    if (isMultiSelect && selectedIds.length > 0) {
      elementsToCut.push(...layoutElements.filter(element => selectedIds.includes(element.id)));
    } else if (selectedId) {
      const element = layoutElements.find(element => element.id === selectedId);
      if (element) elementsToCut.push(element);
    }
    
    if (elementsToCut.length === 0) {
      alert('No elements selected to cut');
      return;
    }
    
    setClipboard(elementsToCut.map(el => ({ ...el })));
    setClipboardOperation('cut');
    
    // Remove cut elements from layout
    const idsToRemove = elementsToCut.map(el => el.id);
    setLayoutElements(prev => prev.filter(element => !idsToRemove.includes(element.id)));
    
    // Clear selection
    setSelectedId(null);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, layoutElements]);

  // Copy selected elements
  const copyElements = useCallback(() => {
    const elementsToCopy = [];
    
    if (isMultiSelect && selectedIds.length > 0) {
      elementsToCopy.push(...layoutElements.filter(element => selectedIds.includes(element.id)));
    } else if (selectedId) {
      const element = layoutElements.find(element => element.id === selectedId);
      if (element) elementsToCopy.push(element);
    }
    
    if (elementsToCopy.length === 0) {
      alert('No elements selected to copy');
      return;
    }
    
    setClipboard(elementsToCopy.map(el => ({ ...el })));
    setClipboardOperation('copy');
  }, [selectedId, selectedIds, isMultiSelect, layoutElements]);

  // Paste elements from clipboard
  const pasteElements = useCallback(() => {
    if (clipboard.length === 0) {
      alert('Nothing to paste');
      return;
    }
    
    const offset = 20; // Offset for pasted elements
    const pastedElements = clipboard.map(element => ({
      ...element,
      id: `${element.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: element.x + offset,
      y: element.y + offset,
    }));
    
    setLayoutElements(prev => [...prev, ...pastedElements]);
    
    // Select the pasted elements
    const pastedIds = pastedElements.map(el => el.id);
    if (pastedIds.length === 1) {
      setSelectedId(pastedIds[0]);
      setSelectedIds([]);
      setIsMultiSelect(false);
    } else {
      setSelectedIds(pastedIds);
      setSelectedId(null);
      setIsMultiSelect(true);
    }
    
    setHasUnsavedChanges(true);
    
    // If it was a cut operation, clear clipboard after first paste
    if (clipboardOperation === 'cut') {
      setClipboard([]);
      setClipboardOperation(null);
    }
  }, [clipboard, clipboardOperation]);

  // Group selected elements
  const groupElements = useCallback(() => {
    if (selectedIds.length < 2) {
      alert('Please select at least 2 elements to group');
      return;
    }

    const elementsToGroup = layoutElements.filter(element => selectedIds.includes(element.id));
    
    // Calculate bounding box for the group
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elementsToGroup.forEach(element => {
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, element.x + element.width);
      maxY = Math.max(maxY, element.y + element.height);
    });

    const groupId = `group_${Date.now()}`;
    const groupElement = {
      id: groupId,
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      color: 'transparent',
      label: 'Group',
      rotation: 0,
      children: elementsToGroup.map(element => ({
        ...element,
        // Convert to relative coordinates within the group
        x: element.x - minX,
        y: element.y - minY,
      })),
    };

    // Remove individual elements and add group
    setLayoutElements(prev => [
      ...prev.filter(element => !selectedIds.includes(element.id)),
      groupElement
    ]);
    
    // Select the new group
    setSelectedId(groupId);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setHasUnsavedChanges(true);
  }, [selectedIds, layoutElements]);

  // Ungroup selected group
  const ungroupElements = useCallback(() => {
    if (!selectedId) {
      alert('Please select a group to ungroup');
      return;
    }

    const groupElement = layoutElements.find(element => element.id === selectedId);
    if (!groupElement || groupElement.type !== 'group') {
      alert('Selected element is not a group');
      return;
    }

    // Convert children back to absolute coordinates
    const ungroupedElements = groupElement.children.map(child => ({
      ...child,
      id: `${child.id}_${Date.now()}`, // Generate new ID to avoid conflicts
      x: child.x + groupElement.x,
      y: child.y + groupElement.y,
    }));

    // Remove group and add individual elements
    setLayoutElements(prev => [
      ...prev.filter(element => element.id !== selectedId),
      ...ungroupedElements
    ]);
    
    // Clear selection
    setSelectedId(null);
    setHasUnsavedChanges(true);
  }, [selectedId, layoutElements]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      if (event.shiftKey) {
        // Ctrl/Cmd + Shift + G = Ungroup
        ungroupElements();
      } else {
        // Ctrl/Cmd + G = Group
        groupElements();
      }
    }
    
    // Clipboard operations
    if (isCtrlOrCmd && event.key.toLowerCase() === 'x') {
      event.preventDefault();
      cutElements();
    }
    
    if (isCtrlOrCmd && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copyElements();
    }
    
    if (isCtrlOrCmd && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      pasteElements();
    }
    
    // Delete key
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteElement();
    }
  }, [groupElements, ungroupElements, deleteElement, cutElements, copyElements, pasteElements]);

  // Track Shift key state for temporary grouping
  const handleKeyUp = useCallback((event) => {
    if (event.key === 'Shift') {
      setIsShiftHeld(false);
      // If no elements are selected, clear temp group
      if (selectedIds.length === 0) {
        setTempGroupBounds(null);
      }
    }
  }, [selectedIds.length]);

  const handleKeyDownForShift = useCallback((event) => {
    if (event.key === 'Shift') {
      setIsShiftHeld(true);
    }
  }, []);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDownForShift);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDownForShift);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyDownForShift, handleKeyUp]);

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
      setHasUnsavedChanges(false);
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
    // Check for unsaved changes before switching layouts
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes that will be lost. Are you sure you want to switch to another layout?'
      );
      if (!confirmSwitch) {
        return;
      }
    }

    try {
      // Try to load from backend first
      const layout = await layoutAPI.getLayoutById(layoutId);
      setLayoutElements(layout.elements || []);
      setLayoutTitle(layout.title);
      setSelectedId(null);
      setSelectedIds([]);
      setIsMultiSelect(false);
      setClipboard([]);
      setClipboardOperation(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.warn('Backend unavailable, loading from localStorage:', error);
      // Fallback to localStorage
      const savedLayouts = JSON.parse(localStorage.getItem('layouts') || '[]');
      const layout = savedLayouts.find(l => l.id === layoutId);
      if (layout) {
        setLayoutElements(layout.elements || []);
        setLayoutTitle(layout.title);
        setSelectedId(null);
        setSelectedIds([]);
        setIsMultiSelect(false);
        setClipboard([]);
        setClipboardOperation(null);
        setHasUnsavedChanges(false);
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
    if (layoutElements.length > 0 || layoutTitle.trim() || hasUnsavedChanges) {
      if (!window.confirm('Are you sure you want to start a new layout? Any unsaved changes will be lost.')) {
        return;
      }
    }
    
    // Clear everything for a fresh start
    setLayoutElements([]);
    setLayoutTitle('');
    setSelectedId(null);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setTempGroupBounds(null);
    setClipboard([]);
    setClipboardOperation(null);
    setHasUnsavedChanges(false);
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
        let right, bottom;
        
        if (element.type === 'round') {
          // For circles, width represents diameter, so right edge is x + width
          right = element.x + element.width;
          bottom = element.y + element.width;
        } else {
          // For rectangles and other shapes
          right = element.x + element.width;
          bottom = element.y + element.height;
        }
        
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      });
      
      // Export full canvas (800x600) instead of cropping
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2
      });
      
      // Restore grid elements and selection styling
      gridElements.forEach(element => element.visible(true));
      
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
      
      // Check if there are any elements (optional warning)
      if (layoutElements.length === 0) {
        const proceed = window.confirm('No elements found. Export empty canvas?');
        if (!proceed) {
          // Restore everything
          gridElements.forEach(element => element.visible(true));
          layer.batchDraw();
          return;
        }
      }
      
      // Export full canvas (800x600) instead of cropping
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2
      });
      
      // Restore grid elements and selection styling
      gridElements.forEach(element => element.visible(true));
      layer.batchDraw();
      
      // Use landscape orientation for 800x600 canvas (wider than tall)
      const pdf = new jsPDF('landscape');
      
      // Calculate dimensions to fit the PDF page
      const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 10px margin on each side
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;
      const aspectRatio = 800 / 600; // Canvas aspect ratio
      
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
      setSelectedIds([]);
      setIsMultiSelect(false);
      setTempGroupBounds(null);
      setClipboard([]);
      setClipboardOperation(null);
      setHasUnsavedChanges(false);
    }
  };

  // Render shape based on type
  const renderShape = (element) => {
    const isSelected = element.id === selectedId || selectedIds.includes(element.id);
    const isInTempGroup = selectedIds.includes(element.id) && selectedIds.length > 1;
    
    const handleDragStart = (e) => {
      if (isInTempGroup) {
        // Store initial positions for group movement
        const initialPositions = {};
        selectedIds.forEach(id => {
          const el = layoutElements.find(element => element.id === id);
          if (el) {
            initialPositions[id] = { x: el.x, y: el.y };
          }
        });
        e.target.setAttr('groupInitialPositions', initialPositions);
      }
    };

    const handleDragMove = (e) => {
      if (isInTempGroup) {
        // Calculate the delta movement from the dragged element's original position
        const deltaX = e.target.x() - element.x;
        const deltaY = e.target.y() - element.y;
        
        // Get initial positions stored at drag start
        const initialPositions = e.target.getAttr('groupInitialPositions');
        
        // Update positions of all OTHER elements in the temporary group
        // maintaining their relative distances
        setLayoutElements(prev => 
          prev.map(el => {
            if (selectedIds.includes(el.id) && el.id !== element.id && initialPositions?.[el.id]) {
              return {
                ...el,
                x: initialPositions[el.id].x + deltaX,
                y: initialPositions[el.id].y + deltaY,
              };
            }
            return el;
          })
        );
      }
    };

    const handleDragEnd = (e) => {
      if (isInTempGroup) {
        // Calculate final delta movement
        const deltaX = e.target.x() - element.x;
        const deltaY = e.target.y() - element.y;
        
        // Get initial positions stored at drag start
        const initialPositions = e.target.getAttr('groupInitialPositions');
        
        // Final position update for all elements in the group
        setLayoutElements(prev => 
          prev.map(el => {
            if (selectedIds.includes(el.id)) {
              if (el.id === element.id) {
                // Update the dragged element to its new position
                return {
                  ...el,
                  x: e.target.x(),
                  y: e.target.y(),
                };
              } else if (initialPositions?.[el.id]) {
                // Update other elements relative to their initial positions
                return {
                  ...el,
                  x: initialPositions[el.id].x + deltaX,
                  y: initialPositions[el.id].y + deltaY,
                };
              }
            }
            return el;
          })
        );
        
        // Clean up
        e.target.setAttr('groupInitialPositions', null);
      } else {
        // Single element movement
        updateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }
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
      stroke: isSelected ? '#0066cc' : (isInTempGroup ? '#3b82f6' : 'transparent'),
      strokeWidth: isSelected ? 2 : (isInTempGroup ? 1 : 0),
      draggable: true,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      onClick: (e) => handleSelect(element.id, e.evt),
      onTap: (e) => handleSelect(element.id, e.evt),
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
    else if (element.type === 'ellipse') {
      shape = (
        <Ellipse
          {...shapeProps}
          radiusX={element.width / 2}
          radiusY={element.height / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'triangle') {
      shape = (
        <RegularPolygon
          {...shapeProps}
          sides={3}
          radius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'pentagon') {
      shape = (
        <RegularPolygon
          {...shapeProps}
          sides={5}
          radius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'hexagon') {
      shape = (
        <RegularPolygon
          {...shapeProps}
          sides={6}
          radius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'octagon') {
      shape = (
        <RegularPolygon
          {...shapeProps}
          sides={8}
          radius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'star') {
      shape = (
        <Star
          {...shapeProps}
          numPoints={5}
          innerRadius={element.width / 4}
          outerRadius={element.width / 2}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'arc') {
      shape = (
        <Arc
          {...shapeProps}
          innerRadius={element.width / 4}
          outerRadius={element.width / 2}
          angle={180}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'line') {
      shape = (
        <Line
          {...shapeProps}
          points={[0, 0, element.width, 0]}
          stroke={element.color}
          strokeWidth={element.height || 2}
          fill={undefined}
          width={undefined}
          height={undefined}
        />
      );
    }
    else if (element.type === 'text') {
      shape = (
        <Text
          {...shapeProps}
          text={element.text || element.label || 'Text'}
          fontSize={16}
          fill={element.color}
          width={element.width}
          height={element.height}
          align="center"
          verticalAlign="middle"
        />
      );
    }
    else if (element.type === 'group') {
      // Special drag handlers for groups
      const handleGroupDragEnd = (e) => {
        const deltaX = e.target.x() - element.x;
        const deltaY = e.target.y() - element.y;
        
        // Update the group position and all children relative positions remain the same
        updateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      };

      const groupProps = {
        key: element.id,
        id: element.id,
        x: element.x,
        y: element.y,
        draggable: true,
        onDragEnd: handleGroupDragEnd,
        onClick: (e) => handleSelect(element.id, e.evt),
        onTap: (e) => handleSelect(element.id, e.evt),
      };

      // Render group as a container with its children
      shape = (
        <Group {...groupProps}>
          {/* Interactive group border */}
          <Rect
            width={element.width}
            height={element.height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke={isSelected ? '#0066cc' : '#9ca3af'}
            strokeWidth={isSelected ? 2 : 1}
            dash={[5, 5]}
            listening={true} // Make this interactive for dragging
          />
          {/* Render children within the group */}
          {element.children && element.children.map(child => {
            const childProps = {
              key: child.id,
              x: child.x,
              y: child.y,
              width: child.width,
              height: child.height,
              fill: child.color,
              listening: false, // Group handles interaction
            };
            
            if (child.type === 'round') {
              return <Circle {...childProps} radius={child.width / 2} />;
            } else if (child.type === 'ellipse') {
              return <Ellipse {...childProps} radiusX={child.width / 2} radiusY={child.height / 2} />;
            } else if (child.type === 'triangle') {
              return <RegularPolygon {...childProps} sides={3} radius={child.width / 2} />;
            } else if (child.type === 'pentagon') {
              return <RegularPolygon {...childProps} sides={5} radius={child.width / 2} />;
            } else if (child.type === 'hexagon') {
              return <RegularPolygon {...childProps} sides={6} radius={child.width / 2} />;
            } else if (child.type === 'octagon') {
              return <RegularPolygon {...childProps} sides={8} radius={child.width / 2} />;
            } else if (child.type === 'star') {
              return <Star {...childProps} numPoints={5} innerRadius={child.width / 4} outerRadius={child.width / 2} />;
            } else if (child.type === 'arc') {
              return <Arc {...childProps} innerRadius={child.width / 4} outerRadius={child.width / 2} angle={180} />;
            } else if (child.type === 'line') {
              return <Line {...childProps} points={[0, 0, child.width, 0]} stroke={child.color} strokeWidth={child.height || 2} />;
            } else if (child.type === 'text') {
              return <Text {...childProps} text={child.text || child.label} fontSize={16} fill={child.color} />;
            } else {
              return <Rect {...childProps} />;
            }
          })}
        </Group>
      );
    }
    else {
      // Default to rectangle for square and any unknown types
      shape = <Rect {...shapeProps} />;
    }

    return (
      <React.Fragment key={element.id}>
        {shape}
        {element.type !== 'text' && element.type !== 'line' && element.type !== 'group' && (
          <Text
            x={element.x + (
              ['round', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(element.type) 
                ? -element.width/4 
                : element.width/2 - 20
            )}
            y={element.y + (
              ['round', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(element.type)
                ? -5 
                : element.height/2 - 5
            )}
            text={element.label}
            fontSize={12}
            fill="white"
            fontStyle="bold"
            align="center"
            listening={false}
          />
        )}
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
            onChange={(e) => {
              setLayoutTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            style={{
              ...styles.titleInput,
              borderColor: hasUnsavedChanges ? '#f59e0b' : '#d1d5db',
              backgroundColor: hasUnsavedChanges ? '#fefcbf' : 'white'
            }}
            autoComplete="off"
          />
          {hasUnsavedChanges && (
            <span style={styles.unsavedIndicator}>●</span>
          )}
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
          {(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
            <>
              <button 
                onClick={cutElements}
                className="btn btn-secondary btn-small"
                title="Cut selected elements (Ctrl+X)"
              >
                Cut (Ctrl+X)
              </button>
              <button 
                onClick={copyElements}
                className="btn btn-secondary btn-small"
                title="Copy selected elements (Ctrl+C)"
              >
                Copy (Ctrl+C)
              </button>
              <button 
                onClick={deleteElement}
                className="btn btn-danger btn-small"
              >
                Delete Selected
              </button>
            </>
          )}
          {clipboard.length > 0 && (
            <button 
              onClick={pasteElements}
              className="btn btn-info btn-small"
              title="Paste elements (Ctrl+V)"
            >
              Paste (Ctrl+V) [{clipboard.length}]
            </button>
          )}
          {isMultiSelect && selectedIds.length > 1 && (
            <button 
              onClick={groupElements}
              className="btn btn-success btn-small"
              title="Group selected elements (Ctrl+G)"
            >
              Group (Ctrl+G)
            </button>
          )}
          {selectedId && layoutElements.find(el => el.id === selectedId)?.type === 'group' && (
            <button 
              onClick={ungroupElements}
              className="btn btn-warning btn-small"
              title="Ungroup selected group (Ctrl+Shift+G)"
            >
              Ungroup (Ctrl+Shift+G)
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

          {/* Grouping Instructions */}
          <div style={styles.sidebarSection}>
            <h3>Controls & Shortcuts</h3>
            <div style={styles.instructionsBox}>
              <p style={styles.instructionText}>
                <strong>Multi-Select:</strong> Hold Shift + Click (creates temp group)
              </p>
              <p style={styles.instructionText}>
                <strong>Cut:</strong> Ctrl/Cmd + X
              </p>
              <p style={styles.instructionText}>
                <strong>Copy:</strong> Ctrl/Cmd + C
              </p>
              <p style={styles.instructionText}>
                <strong>Paste:</strong> Ctrl/Cmd + V
              </p>
              <p style={styles.instructionText}>
                <strong>Group:</strong> Ctrl/Cmd + G
              </p>
              <p style={styles.instructionText}>
                <strong>Ungroup:</strong> Ctrl/Cmd + Shift + G
              </p>
              <p style={styles.instructionText}>
                <strong>Delete:</strong> Delete or Backspace key
              </p>
              {isMultiSelect && (
                <p style={{...styles.instructionText, color: '#3b82f6', fontWeight: 'bold'}}>
                  {selectedIds.length} elements selected {tempGroupBounds ? '(temp group active)' : ''}
                </p>
              )}
              {isShiftHeld && !isMultiSelect && (
                <p style={{...styles.instructionText, color: '#f59e0b', fontWeight: 'bold'}}>
                  Shift held - Click elements to create temp group
                </p>
              )}
              {clipboard.length > 0 && (
                <p style={{...styles.instructionText, color: '#10b981', fontWeight: 'bold'}}>
                  {clipboard.length} element{clipboard.length > 1 ? 's' : ''} in clipboard ({clipboardOperation})
                </p>
              )}
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
              
              {/* Temporary group bounds */}
              {tempGroupBounds && (
                <>
                  <Rect
                    x={tempGroupBounds.x}
                    y={tempGroupBounds.y}
                    width={tempGroupBounds.width}
                    height={tempGroupBounds.height}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dash={[8, 4]}
                    listening={false}
                    name="temp-group-bounds"
                  />
                  {/* Corner indicators for temporary group */}
                  <Circle
                    x={tempGroupBounds.x + tempGroupBounds.width}
                    y={tempGroupBounds.y}
                    radius={4}
                    fill="#3b82f6"
                    listening={false}
                  />
                  <Circle
                    x={tempGroupBounds.x}
                    y={tempGroupBounds.y + tempGroupBounds.height}
                    radius={4}
                    fill="#3b82f6"
                    listening={false}
                  />
                  <Circle
                    x={tempGroupBounds.x + tempGroupBounds.width}
                    y={tempGroupBounds.y + tempGroupBounds.height}
                    radius={4}
                    fill="#3b82f6"
                    listening={false}
                  />
                </>
              )}
              
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
  unsavedIndicator: {
    color: '#f59e0b',
    fontSize: '1.5rem',
    marginLeft: '0.5rem',
    fontWeight: 'bold',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  elementItem: {
    padding: '0.75rem 0.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
    transition: 'opacity 0.2s, transform 0.1s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    minHeight: '70px',
    ':hover': {
      transform: 'scale(1.05)',
    },
  },
  elementIcon: {
    fontSize: '1.5rem',
  },
  elementLabel: {
    fontSize: '0.7rem',
    lineHeight: '0.8rem',
    textAlign: 'center',
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
  instructionsBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1rem',
    fontSize: '0.85rem',
  },
  instructionText: {
    margin: '0.5rem 0',
    color: '#4b5563',
    fontSize: '0.8rem',
    lineHeight: '1.3',
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