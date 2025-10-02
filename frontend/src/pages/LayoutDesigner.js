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
  const [isDragging, setIsDragging] = useState(false);
  const [clipboard, setClipboard] = useState([]);
  const [clipboardOperation, setClipboardOperation] = useState(null); // 'cut' or 'copy'
  const [layoutTitle, setLayoutTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBorderControls, setShowBorderControls] = useState(false);
  
  // Interactive states for border controls
  const [hoveredBorderWidth, setHoveredBorderWidth] = useState(null);
  const [hoveredBorderColor, setHoveredBorderColor] = useState(null);
  const [selectedBorderWidth, setSelectedBorderWidth] = useState(null);
  const [selectedBorderColor, setSelectedBorderColor] = useState(null);
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isCancelHovered, setIsCancelHovered] = useState(false);

  // Available color options
  const colorOptions = [
    '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#fbbf24', '#f97316',
    '#6366f1', '#ec4899', '#84cc16', '#f43f5e', '#06b6d4', '#8b5cf6', '#374151',
    '#1f2937', '#ffffff', '#000000', '#6b7280', '#9ca3af', '#d1d5db'
  ];

  // Layout elements available for adding to canvas
  const elementTypes = [
    // Basic Shapes
    { type: 'round', label: 'Circle', icon: '●', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'square', label: 'Square', icon: '■', defaultWidth: 60, defaultHeight: 60, color: '#9ca3af' },
    { type: 'rectangle', label: 'Rectangle', icon: '▆', defaultWidth: 120, defaultHeight: 60, color: '#9ca3af' },
    { type: 'ellipse', label: 'Oval', icon: '⬬', defaultWidth: 120, defaultHeight: 60, color: '#9ca3af' },
    
    // Polygon Shapes
    { type: 'triangle', label: 'Triangle', icon: '▲', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'hexagon', label: 'Hexagon', icon: '⬢', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'pentagon', label: 'Pentagon', icon: '⬟', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'octagon', label: 'Octagon', icon: '⬢', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    
    // Special Shapes
    { type: 'star', label: 'Star', icon: '★', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'arc', label: 'Arc', icon: '◡', defaultWidth: 100, defaultHeight: 100, color: '#9ca3af' },
    
    // Lines and Dividers
    { type: 'line', label: 'Line', icon: '━', defaultWidth: 100, defaultHeight: 2, color: '#9ca3af' },
    
    // Text and Labels
    { type: 'text', label: 'Text', icon: '✎', defaultWidth: 100, defaultHeight: 30, color: '#9ca3af' },
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

  // Add CSS animations to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
    
    if (isShift) {
      // Multi-select mode: add to existing selection
      if (selectedId && !isMultiSelect) {
        // Convert single selection to multi-select
        setIsMultiSelect(true);
        setSelectedIds([selectedId, id]);
        setSelectedId(null);
        updateTempGroupBounds([selectedId, id]);
      } else if (isMultiSelect) {
        // Add/remove from existing multi-selection
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
      } else {
        // No existing selection, start with this object
        setSelectedId(id);
        setSelectedIds([]);
        setIsMultiSelect(false);
        setTempGroupBounds(null);
      }
    } else {
      // Normal click - single select mode (clears any existing selection)
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

  // Calculate accurate visual bounds for different shape types
  const getElementVisualBounds = useCallback((element) => {
    const { x, y, width, height, type } = element;
    
    switch (type) {
      case 'round': {
        // Circle: x,y is the CENTER, radius is width/2
        const radius = width / 2;
        return {
          minX: x - radius,
          minY: y - radius,
          maxX: x + radius,
          maxY: y + radius
        };
      }
      
      case 'ellipse': {
        // Ellipse: x,y is the CENTER, radiusX=width/2, radiusY=height/2
        const radiusX = width / 2;
        const radiusY = height / 2;
        return {
          minX: x - radiusX,
          minY: y - radiusY,
          maxX: x + radiusX,
          maxY: y + radiusY
        };
      }
      
      case 'triangle':
      case 'pentagon':
      case 'hexagon':
      case 'octagon': {
        // Regular polygons: x,y is the CENTER, inscribed in circle with radius=width/2
        const radius = width / 2;
        return {
          minX: x - radius,
          minY: y - radius,
          maxX: x + radius,
          maxY: y + radius
        };
      }
      
      case 'star': {
        // Star: x,y is the CENTER, outer radius=width/2
        const outerRadius = width / 2;
        return {
          minX: x - outerRadius,
          minY: y - outerRadius,
          maxX: x + outerRadius,
          maxY: y + outerRadius
        };
      }
      
      case 'arc': {
        // Arc: x,y is the CENTER, outer radius=width/2
        const outerRadius = width / 2;
        return {
          minX: x - outerRadius,
          minY: y - outerRadius,
          maxX: x + outerRadius,
          maxY: y + outerRadius
        };
      }
      
      case 'line': {
        // Line: x,y is start point, goes horizontally to x+width,y
        return {
          minX: x,
          minY: y - (height || 2) / 2,
          maxX: x + width,
          maxY: y + (height || 2) / 2
        };
      }
      
      case 'text': {
        // Text: x,y is top-left corner
        return {
          minX: x,
          minY: y,
          maxX: x + width,
          maxY: y + height
        };
      }
      
      default: {
        // Rectangle and other shapes: x,y is top-left corner
        return {
          minX: x,
          minY: y,
          maxX: x + width,
          maxY: y + height
        };
      }
    }
  }, []);

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
    
    // Calculate accurate bounding box using visual bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedElements.forEach(element => {
      const bounds = getElementVisualBounds(element);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });
    
    setTempGroupBounds({
      x: minX - 5, // Add padding
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10,
    });
  }, [layoutElements, getElementVisualBounds]);

  // Update temp group bounds only when selection changes (not when elements move)
  useEffect(() => {
    if (isMultiSelect && selectedIds.length > 1 && !isDragging) {
      updateTempGroupBounds(selectedIds);
    }
  }, [isMultiSelect, selectedIds, updateTempGroupBounds, isDragging]);

  const updateElement = useCallback((id, updates) => {
    setLayoutElements(prev => 
      prev.map(element => 
        element.id === id ? { ...element, ...updates } : element
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Start editing text
  const startTextEdit = useCallback((elementId) => {
    const element = layoutElements.find(el => el.id === elementId);
    if (element) {
      setEditingTextId(elementId);
      // For text elements, use existing text; for other elements, start with existing text or empty
      if (element.type === 'text') {
        setEditingText(element.text || element.label || 'Text');
      } else {
        setEditingText(element.text || '');
      }
    }
  }, [layoutElements]);

  // Finish editing text
  const finishTextEdit = useCallback(() => {
    if (editingTextId) {
      const trimmedText = editingText.trim();
      if (trimmedText) {
        updateElement(editingTextId, { text: trimmedText });
      } else {
        // Remove text property if empty
        updateElement(editingTextId, { text: undefined });
      }
      setEditingTextId(null);
      setEditingText('');
    }
  }, [editingTextId, editingText, updateElement]);

  // Cancel text editing
  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null);
    setEditingText('');
  }, []);

  // Change color of selected elements
  const changeElementColor = useCallback((newColor) => {
    if (isMultiSelect && selectedIds.length > 0) {
      // Change color of multiple selected elements
      setLayoutElements(prev => 
        prev.map(element => 
          selectedIds.includes(element.id) 
            ? { ...element, color: newColor }
            : element
        )
      );
    } else if (selectedId) {
      // Change color of single selected element
      updateElement(selectedId, { color: newColor });
    }
    setShowColorPicker(false);
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement]);

  // Toggle border for selected elements
  const toggleElementBorder = useCallback(() => {
    if (isMultiSelect && selectedIds.length > 0) {
      // Toggle border for multiple selected elements
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            const hasBorder = element.borderWidth && element.borderWidth > 0;
            return {
              ...element,
              borderWidth: hasBorder ? 0 : 2,
              // If turning on border, use existing color or default to blue
              // If turning off border, clear the color to avoid artifacts
              borderColor: hasBorder ? undefined : (element.borderColor || '#3b82f6')
            };
          }
          return element;
        })
      );
    } else if (selectedId) {
      // Toggle border for single selected element
      const element = layoutElements.find(el => el.id === selectedId);
      if (element) {
        const hasBorder = element.borderWidth && element.borderWidth > 0;
        updateElement(selectedId, { 
          borderWidth: hasBorder ? 0 : 2,
          // If turning on border, use existing color or default to blue
          // If turning off border, clear the color to avoid artifacts
          borderColor: hasBorder ? undefined : (element.borderColor || '#3b82f6')
        });
      }
    }
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement, layoutElements]);

  // Change border width
  const changeBorderWidth = useCallback((width) => {
    if (isMultiSelect && selectedIds.length > 0) {
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            return { 
              ...element, 
              borderWidth: width,
              // If setting width to 0, clear border color to avoid black remnants
              // If setting width > 0, ensure there's a visible border color
              borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6')
            };
          }
          return element;
        })
      );
    } else if (selectedId) {
      const element = layoutElements.find(el => el.id === selectedId);
      if (element) {
        updateElement(selectedId, { 
          borderWidth: width,
          // If setting width to 0, clear border color to avoid black remnants
          // If setting width > 0, ensure there's a visible border color
          borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6')
        });
      }
    }
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement, layoutElements]);

  // Change border color
  const changeBorderColor = useCallback((color) => {
    if (isMultiSelect && selectedIds.length > 0) {
      setLayoutElements(prev => 
        prev.map(element => 
          selectedIds.includes(element.id) 
            ? { ...element, borderColor: color }
            : element
        )
      );
    } else if (selectedId) {
      updateElement(selectedId, { borderColor: color });
    }
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement]);

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

  // Layer management functions
  const bringToFront = useCallback(() => {
    if (!selectedId && (!isMultiSelect || selectedIds.length === 0)) return;
    
    const targetIds = selectedId ? [selectedId] : selectedIds;
    
    setLayoutElements(prev => {
      const elementsToMove = prev.filter(element => targetIds.includes(element.id));
      const otherElements = prev.filter(element => !targetIds.includes(element.id));
      return [...otherElements, ...elementsToMove]; // Move to end (front)
    });
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect]);

  const sendToBack = useCallback(() => {
    if (!selectedId && (!isMultiSelect || selectedIds.length === 0)) return;
    
    const targetIds = selectedId ? [selectedId] : selectedIds;
    
    setLayoutElements(prev => {
      const elementsToMove = prev.filter(element => targetIds.includes(element.id));
      const otherElements = prev.filter(element => !targetIds.includes(element.id));
      return [...elementsToMove, ...otherElements]; // Move to beginning (back)
    });
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect]);

  const bringForward = useCallback(() => {
    if (!selectedId && (!isMultiSelect || selectedIds.length === 0)) return;
    
    const targetIds = selectedId ? [selectedId] : selectedIds;
    
    setLayoutElements(prev => {
      const newElements = [...prev];
      
      // Move each selected element forward by one position
      targetIds.forEach(id => {
        const currentIndex = newElements.findIndex(element => element.id === id);
        if (currentIndex < newElements.length - 1) {
          // Swap with next element
          [newElements[currentIndex], newElements[currentIndex + 1]] = 
          [newElements[currentIndex + 1], newElements[currentIndex]];
        }
      });
      
      return newElements;
    });
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect]);

  const sendBackward = useCallback(() => {
    if (!selectedId && (!isMultiSelect || selectedIds.length === 0)) return;
    
    const targetIds = selectedId ? [selectedId] : selectedIds;
    
    setLayoutElements(prev => {
      const newElements = [...prev];
      
      // Move each selected element backward by one position
      targetIds.forEach(id => {
        const currentIndex = newElements.findIndex(element => element.id === id);
        if (currentIndex > 0) {
          // Swap with previous element
          [newElements[currentIndex], newElements[currentIndex - 1]] = 
          [newElements[currentIndex - 1], newElements[currentIndex]];
        }
      });
      
      return newElements;
    });
    setHasUnsavedChanges(true);
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
      return;
    }
    
    setClipboard(elementsToCopy.map(el => ({ ...el })));
    setClipboardOperation('copy');
  }, [selectedId, selectedIds, isMultiSelect, layoutElements]);

  // Paste elements from clipboard
  const pasteElements = useCallback(() => {
    if (clipboard.length === 0) {
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
      return;
    }

    const elementsToGroup = layoutElements.filter(element => selectedIds.includes(element.id));
    
    // Calculate accurate bounding box for the group using visual bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elementsToGroup.forEach(element => {
      const bounds = getElementVisualBounds(element);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
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
    setTempGroupBounds(null);
    setHasUnsavedChanges(true);
  }, [selectedIds, layoutElements, getElementVisualBounds]);

  // Ungroup selected group
  const ungroupElements = useCallback(() => {
    if (!selectedId) {
      return;
    }

    const groupElement = layoutElements.find(element => element.id === selectedId);
    if (!groupElement || groupElement.type !== 'group') {
      return;
    }

    console.log('Ungrouping element:', groupElement);
    console.log('Group children before ungrouping:', groupElement.children);

    // Convert children back to absolute coordinates
    // Children already have their scaled dimensions from the transform handler
    const ungroupedElements = groupElement.children.map(child => ({
      ...child,
      id: `${child.id}_${Date.now()}`, // Generate new ID to avoid conflicts
      x: child.x + groupElement.x,
      y: child.y + groupElement.y,
    }));

    console.log('Ungrouped elements:', ungroupedElements);

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
    // Don't handle shortcuts when editing text
    if (editingTextId) {
      return;
    }
    
    // Check if the user is currently typing in an input field or textarea
    const activeElement = document.activeElement;
    const isTypingInInput = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
    // If user is typing in an input field, allow normal browser behavior
    if (isTypingInInput) {
      return;
    }
    
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
    
    // Clipboard operations - only prevent default if we have elements selected
    if (isCtrlOrCmd && event.key.toLowerCase() === 'x') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        cutElements();
      }
    }
    
    if (isCtrlOrCmd && event.key.toLowerCase() === 'c') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        copyElements();
      }
    }
    
    if (isCtrlOrCmd && event.key.toLowerCase() === 'v') {
      if (clipboard.length > 0) {
        event.preventDefault();
        pasteElements();
      }
    }
    
    // Layer management shortcuts
    if (isCtrlOrCmd && event.shiftKey && event.key === ']') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        // Ctrl/Cmd + Shift + ] = Bring to front
        bringToFront();
      }
    }
    
    if (isCtrlOrCmd && event.shiftKey && event.key === '[') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        // Ctrl/Cmd + Shift + [ = Send to back
        sendToBack();
      }
    }
    
    // Incremental layer movement shortcuts
    if (isCtrlOrCmd && event.key === ']') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        // Ctrl/Cmd + ] = Bring forward one layer
        bringForward();
      }
    }
    
    if (isCtrlOrCmd && event.key === '[') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        // Ctrl/Cmd + [ = Send backward one layer
        sendBackward();
      }
    }
    
    // Delete key - only prevent default if we have elements selected
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedId || (isMultiSelect && selectedIds.length > 0)) {
        event.preventDefault();
        deleteElement();
      }
    }
  }, [editingTextId, groupElements, ungroupElements, deleteElement, cutElements, copyElements, pasteElements, bringToFront, sendToBack, bringForward, sendBackward, selectedId, selectedIds, isMultiSelect, clipboard.length]);

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
        setIsDragging(true);
        // Store initial positions for group movement
        const initialPositions = {};
        selectedIds.forEach(id => {
          const el = layoutElements.find(element => element.id === id);
          if (el) {
            initialPositions[id] = { x: el.x, y: el.y };
          }
        });
        e.target.setAttr('groupInitialPositions', initialPositions);
        
        // Store initial bounds to keep them fixed during drag
        if (tempGroupBounds) {
          e.target.setAttr('initialGroupBounds', { ...tempGroupBounds });
        }
      }
    };

    const handleDragMove = (e) => {
      if (isInTempGroup) {
        // Calculate the delta movement from the dragged element's original position
        const deltaX = e.target.x() - element.x;
        const deltaY = e.target.y() - element.y;
        
        // Get initial positions stored at drag start
        const initialPositions = e.target.getAttr('groupInitialPositions');
        
        // Update the bounds position to follow the drag
        const initialBounds = e.target.getAttr('initialGroupBounds');
        if (initialBounds) {
          setTempGroupBounds({
            ...initialBounds,
            x: initialBounds.x + deltaX,
            y: initialBounds.y + deltaY
          });
        }
        
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
        setIsDragging(false);
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
        e.target.setAttr('initialGroupBounds', null);
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
      
      console.log('Transform end called for element:', element.id, 'type:', element.type, 'scaleX:', scaleX, 'scaleY:', scaleY);
      
      // Check if this is a group element
      if (element.type === 'group') {
        // For groups, we need to scale the children as well
        const newWidth = Math.max(5, node.width() * scaleX);
        const newHeight = Math.max(5, node.height() * scaleY);
        
        // Calculate scale ratios
        const widthRatio = scaleX;
        const heightRatio = scaleY;
        
        console.log('Group scale ratios - widthRatio:', widthRatio, 'heightRatio:', heightRatio);
        
        // Scale all children proportionally
        const scaledChildren = element.children.map(child => ({
          ...child,
          x: child.x * widthRatio,
          y: child.y * heightRatio,
          width: child.width * widthRatio,
          height: child.height * heightRatio,
          // Scale font size for text elements
          fontSize: child.type === 'text' && child.fontSize ? child.fontSize * Math.min(widthRatio, heightRatio) : child.fontSize
        }));
      
        updateElement(element.id, {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
          children: scaledChildren,
        });
      } else {
        // For regular elements, use the original logic
        updateElement(element.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }
      
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
      stroke: isSelected 
        ? '#0066cc' 
        : (isInTempGroup 
          ? '#3b82f6' 
          : (element.borderWidth && element.borderWidth > 0 && element.borderColor
            ? element.borderColor 
            : 'transparent')),
      strokeWidth: isSelected 
        ? 2 
        : (isInTempGroup 
          ? 1 
          : (element.borderWidth || 0)),
      draggable: true,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransform: (e) => {
        // Live update during transform for immediate visual feedback
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Update the element's visual size in real-time
        node.width(element.width * scaleX);
        node.height(element.height * scaleY);
        node.scaleX(1);
        node.scaleY(1);
      },
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
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
        width: element.width,
        height: element.height,
        draggable: true,
        onDragEnd: handleGroupDragEnd,
        onTransform: (e) => {
          // Live update during group transform
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          
          // Update group container size in real-time
          node.width(element.width * scaleX);
          node.height(element.height * scaleY);
          node.scaleX(1);
          node.scaleY(1);
        },
        onTransformEnd: handleTransformEnd, // Add transform handler for groups
        onClick: (e) => handleSelect(element.id, e.evt),
        onTap: (e) => handleSelect(element.id, e.evt),
        onDblClick: () => startTextEdit(element.id),
        onDblTap: () => startTextEdit(element.id),
      };

      // Render group as a container with its children
      shape = (
        <Group {...groupProps}>
          {/* Full area selection rectangle (invisible) */}
          <Rect
            width={element.width}
            height={element.height}
            fill="transparent"
            listening={true} // This makes the entire area clickable
          />
          {/* Visual group border */}
          <Rect
            width={element.width}
            height={element.height}
            // fill="transparent"
            // stroke="transparent"
            strokeWidth={isSelected ? 2 : 1}
            dash={[5, 5]}
            listening={false} // Visual only, selection handled by the invisible rect above
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
              stroke: child.borderColor || '#000000',
              strokeWidth: child.borderWidth || 0,
              listening: false, // Group handles interaction
            };
            
            if (child.type === 'round') {
              return (
                <Circle 
                  {...childProps} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'ellipse') {
              return (
                <Ellipse 
                  {...childProps} 
                  radiusX={child.width / 2} 
                  radiusY={child.height / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'triangle') {
              return (
                <RegularPolygon 
                  {...childProps} 
                  sides={3} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'pentagon') {
              return (
                <RegularPolygon 
                  {...childProps} 
                  sides={5} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'hexagon') {
              return (
                <RegularPolygon 
                  {...childProps} 
                  sides={6} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'octagon') {
              return (
                <RegularPolygon 
                  {...childProps} 
                  sides={8} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'star') {
              return (
                <Star 
                  {...childProps} 
                  numPoints={5} 
                  innerRadius={child.width / 4} 
                  outerRadius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'arc') {
              return (
                <Arc 
                  {...childProps} 
                  innerRadius={child.width / 4} 
                  outerRadius={child.width / 2} 
                  angle={180}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'line') {
              return (
                <Line 
                  {...childProps} 
                  points={[0, 0, child.width, 0]} 
                  stroke={child.color} 
                  strokeWidth={child.height || 2}
                  fill={undefined}
                />
              );
            } else if (child.type === 'text') {
              return (
                <Text 
                  {...childProps} 
                  text={child.text || child.label || 'Text'} 
                  fontSize={child.fontSize || 16}
                  fill={child.color}
                  width={child.width}
                  height={child.height}
                  align="center"
                  verticalAlign="middle"
                  stroke={undefined}
                  strokeWidth={0}
                />
              );
            } else {
              // Default rectangle for square and unknown types
              return <Rect {...childProps} />;
            }
          })}
        </Group>
      );
    }
    else {
      // Default to rectangle for square and any unknown types
      shape = <Rect {...shapeProps} onDblClick={() => startTextEdit(element.id)} onDblTap={() => startTextEdit(element.id)} />;
    }

    return (
      <React.Fragment key={element.id}>
        {shape}
        {element.type !== 'text' && element.type !== 'line' && element.type !== 'group' && element.text && (
          <Text
            x={
              // For centered shapes (circles, polygons, stars, arcs), x is already the center
              ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(element.type)
                ? element.x
                : element.x + element.width / 2  // For rectangles, x is top-left, so add half width
            }
            y={
              // For centered shapes, y is already the center
              ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(element.type)
                ? element.y
                : element.y + element.height / 2  // For rectangles, y is top-left, so add half height
            }
            text={element.text}
            fontSize={14}
            fill="white"
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            width={100}  // Set a width for the text area
            height={30}  // Set a height for the text area
            offsetX={50}  // Offset by half the width to center horizontally
            offsetY={15}  // Offset by half the height to center vertically
            listening={false}
            // Add text shadow for better visibility
            shadowColor="rgba(0, 0, 0, 0.5)"
            shadowBlur={2}
            shadowOffsetX={0.2}
            shadowOffsetY={0.2}
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
    } else if (isMultiSelect && selectedIds.length > 1 && tempGroupBounds && transformerRef.current) {
      // Attach transformer to temp group bounds for multi-selection
      const tempGroupNode = stageRef.current.findOne('.temp-group-bounds');
      if (tempGroupNode) {
        transformerRef.current.nodes([tempGroupNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId, isMultiSelect, selectedIds.length, tempGroupBounds]);

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
            {currentEvent.title} - Layout
          </h2>
        </div>
        
        <div style={styles.toolbarRight}>
          {/* Hide layout title input when objects are selected */}
          {!(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
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
          )}
          {/* {hasUnsavedChanges && (
            <span style={styles.unsavedIndicator}>●</span>
          )} */}
          {/* Hide these buttons when objects are selected */}
          {!(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
            <>
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
            </>
          )}
          {(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
            <>
              <button 
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  // Add visual feedback
                  const button = document.activeElement;
                  if (button) {
                    button.style.transform = 'scale(0.95)';
                    button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    setTimeout(() => {
                      button.style.transform = 'scale(1)';
                      button.style.boxShadow = '';
                    }, 150);
                  }
                }}
                className="btn btn-info btn-small"
                title="Change color - Click to pick a new color for selected objects"
                style={{ 
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  backgroundColor: showColorPicker ? '#10b981' : '',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '';
                }}
              >
                🎨 Color
              </button>
              <button 
                onClick={() => {
                  setShowBorderControls(!showBorderControls);
                  // Add visual feedback
                  const button = document.activeElement;
                  if (button) {
                    button.style.transform = 'scale(0.95)';
                    button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    setTimeout(() => {
                      button.style.transform = 'scale(1)';
                      button.style.boxShadow = '';
                    }, 150);
                  }
                }}
                className="btn btn-info btn-small"
                title="Border settings - Click to add borders to selected objects"
                style={{
                  transition: 'all 0.2s ease',
                  backgroundColor: showBorderControls ? '#3b82f6' : '',
                  color: showBorderControls ? 'white' : '',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '';
                }}
              >
                🔲 Border
              </button>
              
              {/* Layer management buttons */}
              <button 
                onClick={bringToFront}
                className="btn btn-info btn-small"
                title="Bring to front - Move selected objects to the top layer"
              >
                ⬆️ Most Front
              </button>
              <button 
                onClick={sendToBack}
                className="btn btn-info btn-small"
                title="Send to back - Move selected objects to the bottom layer"
              >
                ⬇️ Most Back
              </button>
              
              {/* Incremental layer movement buttons */}
              <button 
                onClick={bringForward}
                className="btn btn-info btn-small"
                title="Bring forward - Move selected objects up one layer (Ctrl+])"
              >
                ↗️ Forward
              </button>
              <button 
                onClick={sendBackward}
                className="btn btn-info btn-small"
                title="Send backward - Move selected objects down one layer (Ctrl+[)"
              >
                ↙️ Backward
              </button>
              
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
                <strong>Edit Text:</strong> Double-click on text elements
              </p>
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
              <p style={styles.instructionText}>
                <strong>Bring to Front:</strong> Ctrl/Cmd + Shift + ]
              </p>
              <p style={styles.instructionText}>
                <strong>Send to Back:</strong> Ctrl/Cmd + Shift + [
              </p>
              <p style={styles.instructionText}>
                <strong>Bring Forward:</strong> Ctrl/Cmd + ]
              </p>
              <p style={styles.instructionText}>
                <strong>Send Backward:</strong> Ctrl/Cmd + [
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
                    listening={true}
                    draggable={true}
                    name="temp-group-bounds"
                    onDragEnd={(e) => {
                      // Handle temp group drag - move all selected elements
                      const deltaX = e.target.x() - tempGroupBounds.x;
                      const deltaY = e.target.y() - tempGroupBounds.y;
                      
                      // Update all selected elements
                      setLayoutElements(prev => 
                        prev.map(element => 
                          selectedIds.includes(element.id)
                            ? { ...element, x: element.x + deltaX, y: element.y + deltaY }
                            : element
                        )
                      );
                      
                      // Update temp group bounds
                      setTempGroupBounds(prev => ({
                        ...prev,
                        x: e.target.x(),
                        y: e.target.y()
                      }));
                      
                      // Reset the rect position
                      e.target.x(tempGroupBounds.x);
                      e.target.y(tempGroupBounds.y);
                    }}
                    onTransform={(e) => {
                      // Live update during temp group transform
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      // Update temp group bounds size in real-time
                      node.width(tempGroupBounds.width * scaleX);
                      node.height(tempGroupBounds.height * scaleY);
                      node.scaleX(1);
                      node.scaleY(1);
                      
                      // Live update of selected elements during transform
                      const newWidth = tempGroupBounds.width * scaleX;
                      const newHeight = tempGroupBounds.height * scaleY;
                      
                      setLayoutElements(prev => 
                        prev.map(element => {
                          if (selectedIds.includes(element.id)) {
                            // Calculate relative position within temp group
                            const relativeX = (element.x - tempGroupBounds.x) / tempGroupBounds.width;
                            const relativeY = (element.y - tempGroupBounds.y) / tempGroupBounds.height;
                            
                            return {
                              ...element,
                              x: tempGroupBounds.x + (relativeX * newWidth),
                              y: tempGroupBounds.y + (relativeY * newHeight),
                              width: element.width * scaleX,
                              height: element.height * scaleY,
                              fontSize: element.type === 'text' && element.fontSize ? element.fontSize * Math.min(scaleX, scaleY) : element.fontSize
                            };
                          }
                          return element;
                        })
                      );
                    }}
                    onTransformEnd={(e) => {
                      // Handle temp group transform - scale all selected elements
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      const newWidth = tempGroupBounds.width * scaleX;
                      const newHeight = tempGroupBounds.height * scaleY;
                      
                      // Scale all selected elements relative to temp group bounds
                      setLayoutElements(prev => 
                        prev.map(element => {
                          if (selectedIds.includes(element.id)) {
                            // Calculate relative position within temp group
                            const relativeX = (element.x - tempGroupBounds.x) / tempGroupBounds.width;
                            const relativeY = (element.y - tempGroupBounds.y) / tempGroupBounds.height;
                            
                            return {
                              ...element,
                              x: tempGroupBounds.x + (relativeX * newWidth),
                              y: tempGroupBounds.y + (relativeY * newHeight),
                              width: element.width * scaleX,
                              height: element.height * scaleY,
                              fontSize: element.type === 'text' && element.fontSize ? element.fontSize * Math.min(scaleX, scaleY) : element.fontSize
                            };
                          }
                          return element;
                        })
                      );
                      
                      // Update temp group bounds
                      setTempGroupBounds(prev => ({
                        ...prev,
                        width: newWidth,
                        height: newHeight
                      }));
                      
                      // Reset transform
                      node.scaleX(1);
                      node.scaleY(1);
                    }}
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

      {/* Text Editing Modal */}
      {editingTextId && (
        <div style={styles.textEditModal}>
          <div style={styles.textEditBox}>
            <h3 style={styles.textEditTitle}>Edit Text</h3>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              style={styles.textEditInput}
              placeholder="Enter text for this element (leave empty to remove text)..."
              autoFocus
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  finishTextEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelTextEdit();
                }
              }}
            />
            <div style={styles.textEditButtons}>
              <button 
                onClick={finishTextEdit}
                style={styles.textEditSaveButton}
              >
                Save (Enter)
              </button>
              <button 
                onClick={cancelTextEdit}
                style={styles.textEditCancelButton}
              >
                Cancel (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (selectedId || (isMultiSelect && selectedIds.length > 0)) && (
        <div style={styles.colorPickerModal}>
          <div style={styles.colorPickerBox}>
            <h3 style={styles.colorPickerTitle}>Choose Color</h3>
            <div style={styles.colorGrid}>
              {colorOptions.map((color, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.colorOption,
                    backgroundColor: color,
                    border: color === '#ffffff' ? '2px solid #e5e7eb' : '2px solid transparent'
                  }}
                  onClick={() => changeElementColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div style={styles.colorPickerButtons}>
              <button 
                onClick={() => setShowColorPicker(false)}
                style={styles.colorPickerCancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Border Controls Modal */}
      {showBorderControls && (selectedId || (isMultiSelect && selectedIds.length > 0)) && (
        <div style={styles.borderControlsModal}>
          <div style={styles.borderControlsBox}>
            <h3 style={styles.borderControlsTitle}>Border Settings</h3>
            
            {/* Border Toggle */}
            <div style={styles.borderSection}>
              <button 
                onClick={() => {
                  toggleElementBorder();
                  // Add visual feedback
                  const button = document.activeElement;
                  if (button) {
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                      button.style.transform = 'scale(1)';
                    }, 150);
                  }
                }}
                onMouseEnter={() => setIsToggleHovered(true)}
                onMouseLeave={() => setIsToggleHovered(false)}
                style={{
                  ...styles.borderToggleButton,
                  ...(isToggleHovered ? styles.borderToggleButtonHover : {})
                }}
              >
                Clear
              </button>
            </div>

            {/* Border Width */}
            <div style={styles.borderSection}>
              <label style={styles.borderLabel}>Border Width:</label>
              <div style={styles.borderWidthButtons}>
                {[1, 2, 3, 4, 5].map(width => {
                  const isSelected = selectedBorderWidth === width;
                  const isHovered = hoveredBorderWidth === width;
                  
                  return (
                    <button
                      key={width}
                      onClick={() => {
                        changeBorderWidth(width);
                        setSelectedBorderWidth(width);
                        // Add click animation
                        const button = document.activeElement;
                        if (button) {
                          button.style.transform = 'scale(0.9)';
                          setTimeout(() => {
                            button.style.transform = isSelected ? 'scale(1.02)' : 'scale(1)';
                          }, 100);
                        }
                      }}
                      onMouseEnter={() => setHoveredBorderWidth(width)}
                      onMouseLeave={() => setHoveredBorderWidth(null)}
                      onFocus={() => setHoveredBorderWidth(width)}
                      onBlur={() => setHoveredBorderWidth(null)}
                      style={{
                        ...styles.borderWidthButton,
                        ...(isHovered ? styles.borderWidthButtonHover : {}),
                        ...(isSelected ? styles.borderWidthButtonSelected : {}),
                        outline: 'none', // Force remove any focus outline
                        border: isSelected ? '1px solid #3b82f6' : 
                                isHovered ? '1px solid #9ca3af' : '1px solid #d1d5db',
                      }}
                    >
                      {width}px
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Border Color */}
            <div style={styles.borderSection}>
              <label style={styles.borderLabel}>Border Color:</label>
              <div style={styles.borderColorGrid}>
                {['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6b7280', 
                  '#ec4899', '#84cc16', '#f43f5e', '#06b6d4', '#fbbf24', '#f97316', '#6366f1', '#9ca3af'].map((color, index) => {
                  const isSelected = selectedBorderColor === color;
                  const isHovered = hoveredBorderColor === index;
                  
                  return (
                    <div
                      key={index}
                      style={{
                        ...styles.borderColorOption,
                        backgroundColor: color,
                        border: color === '#ffffff' ? '2px solid #e5e7eb' : 
                                isSelected ? '2px solid #374151' : '2px solid transparent',
                        ...(isHovered ? styles.borderColorOptionHover : {}),
                        ...(isSelected ? styles.borderColorOptionSelected : {})
                      }}
                      onClick={() => {
                        changeBorderColor(color);
                        setSelectedBorderColor(color);
                      }}
                      onMouseEnter={() => setHoveredBorderColor(index)}
                      onMouseLeave={() => setHoveredBorderColor(null)}
                      title={`Border Color: ${color}`}
                    />
                  );
                })}
              </div>
            </div>

            <div style={styles.borderControlsButtons}>
              <button 
                onClick={() => setShowBorderControls(false)}
                onMouseEnter={() => setIsCancelHovered(true)}
                onMouseLeave={() => setIsCancelHovered(false)}
                style={{
                  ...styles.borderControlsCancelButton,
                  ...(isCancelHovered ? styles.borderControlsCancelButtonHover : {})
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  textEditModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  textEditBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    minWidth: '400px',
    maxWidth: '500px',
  },
  textEditTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  textEditInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  textEditButtons: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
    justifyContent: 'center',
  },
  textEditSaveButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  textEditCancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  colorPickerModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  colorPickerBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    minWidth: '320px',
    maxWidth: '400px',
  },
  colorPickerTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  colorOption: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  colorPickerButtons: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1.5rem',
  },
  colorPickerCancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  borderControlsModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  borderControlsBox: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    minWidth: '320px',
    maxWidth: '400px',
    animation: 'slideIn 0.3s ease-out',
    transform: 'scale(1)',
  },
  borderControlsTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  borderSection: {
    marginBottom: '1.5rem',
  },
  borderLabel: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem',
  },
  borderToggleButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    transform: 'scale(1)',
  },
  borderToggleButtonHover: {
    backgroundColor: '#2563eb',
    transform: 'scale(1.02)',
    boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)',
  },
  borderToggleButtonActive: {
    transform: 'scale(0.98)',
    backgroundColor: '#1d4ed8',
  },
  borderWidthButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  borderWidthButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: 'scale(1)',
    minWidth: '40px',
    textAlign: 'center',
    outline: 'none', // Remove focus outline
    '&:focus': {
      outline: 'none',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
    },
    '&:active': {
      outline: 'none',
    },
  },
  borderWidthButtonHover: {
    backgroundColor: '#e5e7eb',
    borderColor: '#9ca3af',
    transform: 'scale(1.05)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  borderWidthButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
    transform: 'scale(1.02)',
  },
  borderWidthButtonSelected: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
  },
  borderColorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
  },
  borderColorOption: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transform: 'scale(1)',
    border: '2px solid transparent',
  },
  borderColorOptionHover: {
    transform: 'scale(1.15)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    zIndex: 10,
  },
  borderColorOptionActive: {
    transform: 'scale(1.1)',
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.25)',
  },
  borderColorOptionSelected: {
    border: '2px solid #374151',
    transform: 'scale(1.1)',
    boxShadow: '0 0 0 2px rgba(55, 65, 81, 0.3)',
  },
  borderControlsButtons: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1.5rem',
  },
  borderControlsCancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: 'scale(1)',
  },
  borderControlsCancelButtonHover: {
    backgroundColor: '#4b5563',
    transform: 'scale(1.02)',
    boxShadow: '0 4px 8px rgba(107, 114, 128, 0.3)',
  },
};

export default LayoutDesigner;