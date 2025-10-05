import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Stage, Layer, Rect, Circle, Text, Transformer, Ellipse, Line, RegularPolygon, Star, Arc, Group, Path } from 'react-konva';
import { fetchEventById } from '../store/eventSlice';
import layoutAPI from '../utils/api/layoutAPI';
import userElementsAPI from '../utils/api/userElementsAPI';
import jsPDF from 'jspdf';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '@mdi/react';
import { 
  mdiArrangeBringToFront, 
  mdiArrangeBringForward, 
  mdiArrangeSendBackward, 
  mdiArrangeSendToBack 
} from '@mdi/js';

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
  const [editingChildElement, setEditingChildElement] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBorderControls, setShowBorderControls] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showStyleControls, setShowStyleControls] = useState(false);
  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [showInfoHover, setShowInfoHover] = useState(false);
  
  // Interactive states for border controls
  const [hoveredBorderWidth, setHoveredBorderWidth] = useState(null);
  const [hoveredBorderColor, setHoveredBorderColor] = useState(null);
  const [selectedBorderWidth, setSelectedBorderWidth] = useState(0);
  const [selectedBorderColor, setSelectedBorderColor] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#9ca3af');
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const [isCancelHovered, setIsCancelHovered] = useState(false);
  
  // Snap-to-grid functionality
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showSnapGuides, setShowSnapGuides] = useState([]);
  const GRID_SIZE_X = 20; // Horizontal grid spacing
  const GRID_SIZE_Y = 15; // Vertical grid spacing
  const SNAP_THRESHOLD = 10; // Distance threshold for snapping

  // Custom elements state
  const [customElements, setCustomElements] = useState([]);
  const [isLoadingCustomElements, setIsLoadingCustomElements] = useState(false);
  const [showCustomElementsPanel, setShowCustomElementsPanel] = useState(true);
  const [customElementsFilter, setCustomElementsFilter] = useState({ search: '' });
  const [showSaveElementDialog, setShowSaveElementDialog] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Element duplication state
  const [showDuplicationModal, setShowDuplicationModal] = useState(false);
  const [duplicationConfig, setDuplicationConfig] = useState({
    startValue: '1',
    endValue: '5',
    increment: 1,
    duplicateCount: 5,
    direction: 'right', // 'left', 'right', 'up', 'down'
    gap: 20,
  });

  // Page size state - Dynamic canvas dimensions
  const [pageSize, setPageSize] = useState({ width: 800, height: 600 });
  const [pageSizePreset, setPageSizePreset] = useState('custom');
  const [showPageSizeControls, setShowPageSizeControls] = useState(false);
  
  // Page size presets - Define early so it can be used by other functions
  const pageSizePresets = {
    'custom': { width: 800, height: 600, canvasWidth: 800, canvasHeight: 600, label: 'Custom' },
    'a4-portrait': { width: 595, height: 842, canvasWidth: 800, canvasHeight: 1132, label: 'A4 Portrait' },
    'a4-landscape': { width: 842, height: 595, canvasWidth: 800, canvasHeight: 566, label: 'A4 Landscape' },
    'letter-portrait': { width: 612, height: 792, canvasWidth: 800, canvasHeight: 1035, label: 'Letter Portrait' },
    'letter-landscape': { width: 792, height: 612, canvasWidth: 800, canvasHeight: 618, label: 'Letter Landscape' },
    'square': { width: 1000, height: 1000, canvasWidth: 800, canvasHeight: 800, label: 'Square' },
  };
  
  // Use canvas dimensions from page size presets
  const currentPreset = pageSizePresets[pageSizePreset] || pageSizePresets.custom;
  const STAGE_WIDTH = currentPreset.canvasWidth;
  const STAGE_HEIGHT = currentPreset.canvasHeight;
  
  // Calculate scale factor to fit stage within 800px width while maintaining aspect ratio
  const CANVAS_SCALE = Math.min(800 / currentPreset.canvasWidth, 1);

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
    // { type: 'pentagon', label: 'Pentagon', icon: '⬟', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    { type: 'octagon', label: 'Octagon', icon: '⬢', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    
    // Special Shapes
    { type: 'star', label: 'Star', icon: '★', defaultWidth: 80, defaultHeight: 80, color: '#9ca3af' },
    // { type: 'arc', label: 'Arc', icon: '◡', defaultWidth: 100, defaultHeight: 100, color: '#9ca3af' },
    
    // Lines and Dividers
    { type: 'rectangle', label: 'Line', icon: '━', defaultWidth: 100, defaultHeight: 2, color: '#9ca3af' },
    
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

  // Load custom elements for the current user
  const loadCustomElements = useCallback(async () => {
    try {
      setIsLoadingCustomElements(true);
      console.log('Loading custom elements with filter:', customElementsFilter);
      const result = await userElementsAPI.getUserElements(customElementsFilter);
      console.log('Custom elements API result:', result);
      setCustomElements(result.elements);
    } catch (error) {
      console.warn('Failed to load custom elements:', error);
      // Fallback to localStorage for custom elements
      const saved = JSON.parse(localStorage.getItem('customElements') || '[]');
      console.log('Using fallback custom elements from localStorage:', saved);
      setCustomElements(saved);
    } finally {
      setIsLoadingCustomElements(false);
    }
  }, [customElementsFilter]);

  // Add custom element from selected elements
  const addCustomElementFromSelection = useCallback(async (name) => {
    // Get elements to save - could be multiple selection or single grouped element
    const elementsToSave = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    
    if (elementsToSave.length === 0) return false;

    const selectedElements = layoutElements.filter(el => elementsToSave.includes(el.id));
    
    // Check if we have a single grouped/merged element
    const isSingleGrouped = elementsToSave.length === 1 && 
                           selectedElements.some(el => el.type === 'group' || el.isGrouped || el.isMerged);

    // Allow saving any selected elements (single or multiple)
    console.log('Saving', elementsToSave.length, 'element(s) as custom element');

    // Don't generate canvas thumbnail - we'll use actual Konva elements
    const thumbnail = null;
    console.log('Using live Konva preview instead of canvas thumbnail for', selectedElements.length, 'elements');

    const elementData = {
      name,
      element_data: {
        type: 'group',
        elements: selectedElements,
        element_count: selectedElements.length,
        isFromGrouped: isSingleGrouped,
        originalType: isSingleGrouped ? selectedElements[0].type : 'multi-selection'
      },
      thumbnail,

      is_public: false
    };

    try {
      const newElement = await userElementsAPI.createElementFromSelection(elementData);
      await loadCustomElements(); // Reload the list
      return true;
    } catch (error) {
      console.error('Failed to save custom element:', error);
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('customElements') || '[]');
      const newElement = {
        ...elementData,
        element_id: Date.now(),
        user_id: 1,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saved.push(newElement);
      localStorage.setItem('customElements', JSON.stringify(saved));
      setCustomElements(saved);
      return true;
    }
  }, [selectedIds, selectedId, layoutElements, loadCustomElements]);

  // Calculate the outline path for merged objects that follows the actual shape perimeters
  const calculateMergedOutlinePath = useCallback((elements, offsetX, offsetY) => {
    // Create individual shape paths and combine them
    let combinedPath = '';
    
    elements.forEach((element, index) => {
      // Use relative coordinates since the Path component will be positioned at offsetX, offsetY
      const relativeX = element.x - offsetX;
      const relativeY = element.y - offsetY;
      
      let shapePath = '';
      
      if (element.type === 'round') {
        // Circle path - element x,y is center
        const radius = element.width / 2;
        const centerX = relativeX;
        const centerY = relativeY;
        shapePath = `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} Z`;
      } else if (element.type === 'ellipse') {
        // Ellipse path - element x,y is center
        const radiusX = element.width / 2;
        const radiusY = element.height / 2;
        const centerX = relativeX;
        const centerY = relativeY;
        shapePath = `M ${centerX + radiusX} ${centerY} A ${radiusX} ${radiusY} 0 0 1 ${centerX - radiusX} ${centerY} A ${radiusX} ${radiusY} 0 0 1 ${centerX + radiusX} ${centerY} Z`;
      } else if (element.type === 'triangle') {
        // Triangle path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const radius = element.width / 2;
        const point1X = centerX;
        const point1Y = centerY - radius;
        const point2X = centerX - radius * Math.cos(Math.PI / 6);
        const point2Y = centerY + radius * Math.sin(Math.PI / 6);
        const point3X = centerX + radius * Math.cos(Math.PI / 6);
        const point3Y = centerY + radius * Math.sin(Math.PI / 6);
        shapePath = `M ${point1X} ${point1Y} L ${point2X} ${point2Y} L ${point3X} ${point3Y} Z`;
      } else if (element.type === 'pentagon') {
        // Pentagon path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const radius = element.width / 2;
        let pentagonPath = '';
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * Math.PI / 180;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            pentagonPath += `M ${x} ${y}`;
          } else {
            pentagonPath += ` L ${x} ${y}`;
          }
        }
        shapePath = pentagonPath + ' Z';
      } else if (element.type === 'hexagon') {
        // Hexagon path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const radius = element.width / 2;
        let hexagonPath = '';
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 90) * Math.PI / 180;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            hexagonPath += `M ${x} ${y}`;
          } else {
            hexagonPath += ` L ${x} ${y}`;
          }
        }
        shapePath = hexagonPath + ' Z';
      } else if (element.type === 'octagon') {
        // Octagon path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const radius = element.width / 2;
        let octagonPath = '';
        for (let i = 0; i < 8; i++) {
          const angle = (i * 45 - 90) * Math.PI / 180;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            octagonPath += `M ${x} ${y}`;
          } else {
            octagonPath += ` L ${x} ${y}`;
          }
        }
        shapePath = octagonPath + ' Z';
      } else if (element.type === 'star') {
        // Star path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const outerRadius = element.width / 2;
        const innerRadius = outerRadius * 0.5;
        let starPath = '';
        for (let i = 0; i < 10; i++) {
          const angle = (i * 36 - 90) * Math.PI / 180;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            starPath += `M ${x} ${y}`;
          } else {
            starPath += ` L ${x} ${y}`;
          }
        }
        shapePath = starPath + ' Z';
      } else if (element.type === 'arc') {
        // Arc path - element x,y is center
        const centerX = relativeX;
        const centerY = relativeY;
        const outerRadius = element.width / 2;
        const innerRadius = outerRadius / 2;
        // Create arc shape (semicircle)
        shapePath = `M ${centerX - outerRadius} ${centerY} A ${outerRadius} ${outerRadius} 0 0 1 ${centerX + outerRadius} ${centerY} L ${centerX + innerRadius} ${centerY} A ${innerRadius} ${innerRadius} 0 0 0 ${centerX - innerRadius} ${centerY} Z`;
      } else if (element.type === 'line') {
        // Line path - element x,y is top-left corner
        const startX = relativeX;
        const startY = relativeY + element.height / 2; // Center the line vertically
        const endX = relativeX + element.width;
        const endY = startY;
        // Create a thin rectangle for the line border
        const lineHeight = element.height || 2;
        shapePath = `M ${startX} ${startY - lineHeight/2} L ${endX} ${startY - lineHeight/2} L ${endX} ${startY + lineHeight/2} L ${startX} ${startY + lineHeight/2} Z`;
      } else {
        // Rectangle path (including square, rectangle, text) - element x,y is top-left corner
        shapePath = `M ${relativeX} ${relativeY} L ${relativeX + element.width} ${relativeY} L ${relativeX + element.width} ${relativeY + element.height} L ${relativeX} ${relativeY + element.height} Z`;
      }
      
      combinedPath += shapePath + ' ';
    });
    
    return combinedPath.trim();
  }, []);

  // Add custom element to layout
  const addCustomElementToLayout = useCallback(async (customElement) => {
    if (!customElement.element_data) return;

    try {
      // Increment usage count
      await userElementsAPI.incrementElementUsage(customElement.element_id);
    } catch (error) {
      console.warn('Failed to increment usage count:', error);
    }

    if (customElement.element_data.type === 'group') {
      const elements = customElement.element_data.elements || [];
      const wasOriginallyMerged = customElement.element_data.isFromGrouped && 
                                 customElement.element_data.originalType === 'merged';
      
      // Special case: if it's a single merged element, restore it directly
      if (wasOriginallyMerged && elements.length === 1 && elements[0].type === 'merged') {
        const originalMerged = elements[0];
        const restoredMerged = {
          ...originalMerged,
          id: `merged_${Date.now()}`,
          x: 100, // Base position
          y: 100, // Base position
          // Give new IDs to children to avoid conflicts
          children: originalMerged.children ? originalMerged.children.map(child => ({
            ...child,
            id: `${Date.now()}-${Math.random()}`
          })) : []
        };
        
        setLayoutElements(prev => [...prev, restoredMerged]);
        setHasUnsavedChanges(true);
        return;
      }
      
      // Special case: if it's a single grouped element, restore it directly
      if (!wasOriginallyMerged && elements.length === 1 && elements[0].type === 'group') {
        const originalGroup = elements[0];
        const restoredGroup = {
          ...originalGroup,
          id: `group_${Date.now()}`,
          x: 100, // Base position
          y: 100, // Base position
          // Give new IDs to children to avoid conflicts
          children: originalGroup.children ? originalGroup.children.map(child => ({
            ...child,
            id: `${Date.now()}-${Math.random()}`
          })) : []
        };
        
        setLayoutElements(prev => [...prev, restoredGroup]);
        setHasUnsavedChanges(true);
        return;
      }
      
      const baseX = 100; // Base position
      const baseY = 100;
      
      // Calculate bounding box for all elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      elements.forEach(el => {
        const bounds = getElementVisualBounds(el);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      });
      
      if (wasOriginallyMerged) {
        // Create merged element if it was originally merged
        const mergedId = `merged_${Date.now()}`;
        
        // Combine text from text elements
        const combinedText = elements
          .filter(el => el.type === 'text' && el.text && el.text.trim())
          .map(el => el.text.trim())
          .join(' ');
        
        // Use border properties from elements that have borders
        const bordersWithWidth = elements.filter(el => el.borderWidth && el.borderWidth > 0);
        const borderWidth = bordersWithWidth.length > 0 ? bordersWithWidth[0].borderWidth : 0;
        const borderColor = bordersWithWidth.length > 0 ? bordersWithWidth[0].borderColor : '#374151';
        
        // Calculate the outline path for the merged element
        const outlinePath = calculateMergedOutlinePath(elements, minX, minY);
        
        const mergedElement = {
          id: mergedId,
          type: 'merged',
          x: baseX,
          y: baseY,
          width: maxX - minX,
          height: maxY - minY,
          color: 'transparent',
          label: customElement.name || 'Custom Element',
          rotation: 0,
          text: combinedText || null,
          borderWidth: borderWidth,
          borderColor: borderColor,
          outlinePath: outlinePath,
          children: elements.map(el => ({
            ...el,
            id: `${Date.now()}-${Math.random()}`,
            x: el.x - minX,
            y: el.y - minY,
            originalText: el.text,
            text: el.type === 'text' ? el.text : null,
          })),
          isMerged: true,
        };
        
        setLayoutElements(prev => [...prev, mergedElement]);
      } else {
        // Create group element if it was originally just selected elements
        const groupId = `group_${Date.now()}`;
        
        const groupElement = {
          id: groupId,
          type: 'group',
          x: baseX,
          y: baseY,
          width: maxX - minX,
          height: maxY - minY,
          color: 'transparent',
          label: customElement.name || 'Custom Element',
          rotation: 0,
          borderWidth: 0,
          borderColor: 'transparent',
          children: elements.map(el => ({
            ...el,
            id: `${Date.now()}-${Math.random()}`,
            x: el.x - minX,
            y: el.y - minY,
            originalText: el.text,
            text: el.type === 'text' ? el.text : null,
          })),
          isGrouped: true,
        };
        
        setLayoutElements(prev => [...prev, groupElement]);
      }
      
      setHasUnsavedChanges(true);
    } else {
      // Add single element
      const elementData = customElement.element_data;
      const newElement = {
        id: `${Date.now()}-${Math.random()}`,
        ...elementData,
        x: 100,
        y: 100
      };
      setLayoutElements(prev => [...prev, newElement]);
      setHasUnsavedChanges(true);
    }
  }, [calculateMergedOutlinePath]); // getElementVisualBounds is stable and doesn't need to be in deps

  // Delete custom element
  const deleteCustomElement = useCallback(async (elementId) => {
    try {
      await userElementsAPI.deleteUserElement(elementId);
      await loadCustomElements(); // Reload the list
    } catch (error) {
      console.error('Failed to delete custom element:', error);
      // Fallback to localStorage
      const saved = JSON.parse(localStorage.getItem('customElements') || '[]');
      const filtered = saved.filter(el => el.element_id !== elementId);
      localStorage.setItem('customElements', JSON.stringify(filtered));
      setCustomElements(filtered);
    }
  }, [loadCustomElements]);

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

  // Load custom elements
  useEffect(() => {
    loadCustomElements();
  }, [loadCustomElements]);

  // Page-wide click handler for deselection
  useEffect(() => {
    const handlePageClick = (event) => {
      // Check if the click is on a canvas element or UI control that should not deselect
      const isCanvasElement = event.target.closest('canvas') || 
                             event.target.closest('.konvajs-content') ||
                             event.target.closest('[data-prevent-deselect]') ||
                             event.target.closest('[data-export-dropdown]') ||
                             event.target.closest('[data-style-dropdown]');
      
      // Don't deselect if clicking on canvas elements or certain UI controls
      if (!isCanvasElement) {
        handleDeselect();
      }
    };

    document.addEventListener('click', handlePageClick);
    
    return () => {
      document.removeEventListener('click', handlePageClick);
    };
  }, []);

  const addElement = (elementType) => {
    // Get optimal position using auto-alignment
    const optimalPosition = getOptimalPlacementPosition();
    
    const newElement = {
      id: Date.now().toString(),
      type: elementType.type,
      x: optimalPosition.x,
      y: optimalPosition.y,
      width: elementType.defaultWidth,
      height: elementType.defaultHeight,
      color: elementType.color,
      label: elementType.label,
      rotation: 0,
    };
    
    // Add special properties for text elements
    if (elementType.type === 'text') {
      newElement.text = 'Text';
    }
    
    setLayoutElements(prev => [...prev, newElement]);
    setHasUnsavedChanges(true);
    
    // Auto-select the newly added element
    setSelectedId(newElement.id);
    setSelectedIds([]);
    setIsMultiSelect(false);
    
    // Clear any persistent border control states when adding new elements
    setSelectedBorderWidth(0);
    setSelectedBorderColor(null);
    setSelectedColor('#9ca3af');
    setHoveredBorderWidth(null);
    setHoveredBorderColor(null);
  };

  const handleSelect = (id, event) => {
    console.log('=== ELEMENT SELECTION DEBUG ===');
    console.log('Selecting element ID:', id);
    console.log('Event:', event);
    console.log('Current selectedId:', selectedId);
    console.log('Current isMultiSelect:', isMultiSelect);
    console.log('Current selectedIds:', selectedIds);
    
    const isShift = event?.shiftKey;
    
    if (isShift) {
      // Multi-select mode: add to existing selection
      if (selectedId && !isMultiSelect) {
        // Convert single selection to multi-select
        setIsMultiSelect(true);
        setSelectedIds([selectedId, id]);
        setSelectedId(null);
        updateTempGroupBounds([selectedId, id]);
        // Clear border control states for multi-selection
        setSelectedBorderWidth(0);
        setSelectedBorderColor(null);
        setSelectedColor('#9ca3af');
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
              
              // Update border control states for single selection
              const selectedElement = layoutElements.find(el => el.id === newSelection[0]);
              if (selectedElement) {
                setSelectedBorderWidth(selectedElement.borderWidth || 0);
                setSelectedBorderColor(selectedElement.borderColor || null);
                setSelectedColor(selectedElement.color || '#9ca3af');
              }
            }
          } else {
            // Add to selection
            newSelection = [...prev, id];
          }
          
          // Update temporary group bounds
          if (newSelection.length > 1) {
            updateTempGroupBounds(newSelection);
            // Clear border control states for multi-selection
            setSelectedBorderWidth(0);
            setSelectedBorderColor(null);
            setSelectedColor('#9ca3af');
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
        
        // Update border control states to match the selected element's properties
        const selectedElement = layoutElements.find(el => el.id === id);
        if (selectedElement) {
          setSelectedBorderWidth(selectedElement.borderWidth || 0);
          setSelectedBorderColor(selectedElement.borderColor || null);
          setSelectedColor(selectedElement.color || '#9ca3af');
        }
      }
    } else {
      // Normal click - single select mode (clears any existing selection)
      setSelectedId(id);
      setSelectedIds([]);
      setIsMultiSelect(false);
      setTempGroupBounds(null);
      
      // Update border control states to match the selected element's properties
      const selectedElement = layoutElements.find(el => el.id === id);
      if (selectedElement) {
        setSelectedBorderWidth(selectedElement.borderWidth || 0);
        setSelectedBorderColor(selectedElement.borderColor || null);
        setSelectedColor(selectedElement.color || '#9ca3af');
      }
    }
  };

  const handleDeselect = () => {
    setSelectedId(null);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setTempGroupBounds(null);
    
    // Clear border control states when deselecting
    setSelectedBorderWidth(0);
    setSelectedBorderColor(null);
    setSelectedColor('#9ca3af');
    setHoveredBorderWidth(null);
    setHoveredBorderColor(null);
    setShowBorderControls(false);
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

  // Snap-to-grid utility functions
  const snapToGridPosition = useCallback((x, y) => {
    if (!snapToGrid) return { x, y };
    
    const snappedX = Math.round(x / GRID_SIZE_X) * GRID_SIZE_X;
    const snappedY = Math.round(y / GRID_SIZE_Y) * GRID_SIZE_Y;
    
    return { x: snappedX, y: snappedY };
  }, [snapToGrid, GRID_SIZE_X, GRID_SIZE_Y]);

  const shouldSnapToPosition = useCallback((currentX, currentY, targetX, targetY) => {
    if (!snapToGrid) return false;
    
    const deltaX = Math.abs(currentX - targetX);
    const deltaY = Math.abs(currentY - targetY);
    
    return deltaX <= SNAP_THRESHOLD && deltaY <= SNAP_THRESHOLD;
  }, [snapToGrid, SNAP_THRESHOLD]);

  const findNearestGridPosition = useCallback((x, y) => {
    const nearbyPositions = [];
    
    // Calculate nearby grid intersections
    const gridX = Math.round(x / GRID_SIZE_X) * GRID_SIZE_X;
    const gridY = Math.round(y / GRID_SIZE_Y) * GRID_SIZE_Y;
    
    // Check nearby grid points
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const snapX = gridX + (offsetX * GRID_SIZE_X);
        const snapY = gridY + (offsetY * GRID_SIZE_Y);
        
        if (shouldSnapToPosition(x, y, snapX, snapY)) {
          nearbyPositions.push({ x: snapX, y: snapY });
        }
      }
    }
    
    // Return closest position or original if none found
    if (nearbyPositions.length > 0) {
      return nearbyPositions.reduce((closest, pos) => {
        const currentDist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        const closestDist = Math.sqrt(Math.pow(x - closest.x, 2) + Math.pow(y - closest.y, 2));
        return currentDist < closestDist ? pos : closest;
      });
    }
    
    return { x, y };
  }, [GRID_SIZE_X, GRID_SIZE_Y, shouldSnapToPosition]);

  const getOptimalPlacementPosition = useCallback(() => {
    // Find a good starting position for new elements
    const spacing = Math.max(GRID_SIZE_X, GRID_SIZE_Y) * 2;
    let startX = GRID_SIZE_X * 5; // Start 5 grid units from left
    let startY = GRID_SIZE_Y * 5; // Start 5 grid units from top
    
    // Check if position is occupied by existing elements
    const isPositionOccupied = (x, y, width = 60, height = 60) => {
      return layoutElements.some(element => {
        const buffer = 20; // Minimum distance between elements
        return (
          x < element.x + element.width + buffer &&
          x + width + buffer > element.x &&
          y < element.y + element.height + buffer &&
          y + height + buffer > element.y
        );
      });
    };
    
    // Find next available position
    while (isPositionOccupied(startX, startY)) {
      startX += spacing;
      if (startX > 600) { // If too far right, move to next row
        startX = GRID_SIZE_X * 5;
        startY += spacing;
      }
      if (startY > 400) { // If too far down, reset to top
        startY = GRID_SIZE_Y * 5;
        break;
      }
    }
    
    return snapToGridPosition(startX, startY);
  }, [layoutElements, snapToGridPosition, GRID_SIZE_X, GRID_SIZE_Y]);

  // Start editing text
  const startTextEdit = useCallback((elementId, childElement = null) => {
    if (childElement) {
      // Editing a child element within a group
      setEditingTextId(elementId); // Use the composite ID
      setEditingChildElement(childElement); // Store the child element reference
      if (childElement.type === 'text') {
        setEditingText(childElement.text || childElement.label || 'Text');
      } else {
        setEditingText(childElement.text || '');
      }
    } else {
      // Regular element editing
      const element = layoutElements.find(el => el.id === elementId);
      if (element) {
        setEditingTextId(elementId);
        setEditingChildElement(null);
        // For text elements, use existing text; for other elements, start with existing text or empty
        if (element.type === 'text') {
          setEditingText(element.text || element.label || 'Text');
        } else {
          setEditingText(element.text || '');
        }
      }
    }
  }, [layoutElements]);

  // Finish editing text
  const finishTextEdit = useCallback(() => {
    if (editingTextId) {
      const trimmedText = editingText.trim();
      
      if (editingChildElement) {
        // Editing a child element within a group
        const groupId = editingTextId.split('_child_')[0];
        const groupElement = layoutElements.find(el => el.id === groupId);
        
        if (groupElement && groupElement.type === 'group') {
          const updatedChildren = groupElement.children.map(child => 
            child.id === editingChildElement.id 
              ? { ...child, text: trimmedText || undefined }
              : child
          );
          
          updateElement(groupId, { children: updatedChildren });
        }
      } else {
        // Regular element editing
        if (trimmedText) {
          updateElement(editingTextId, { text: trimmedText });
        } else {
          // Remove text property if empty
          updateElement(editingTextId, { text: undefined });
        }
      }
      
      setEditingTextId(null);
      setEditingText('');
      setEditingChildElement(null);
    }
  }, [editingTextId, editingText, editingChildElement, updateElement, layoutElements]);

  // Cancel text editing
  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null);
    setEditingText('');
    setEditingChildElement(null);
  }, []);

  // Change color of selected elements
  const changeElementColor = useCallback((newColor) => {
    if (isMultiSelect && selectedIds.length > 0) {
      // Change color of multiple selected elements
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            if (element.type === 'merged' && element.children) {
              // For merged objects, update both the element color and all children colors
              return {
                ...element,
                color: newColor,
                children: element.children.map(child => ({
                  ...child,
                  color: newColor
                }))
              };
            } else if (element.type === 'group' && element.children) {
              // For group objects, update all children colors (preserve border properties)
              return {
                ...element,
                color: newColor,
                children: element.children.map(child => ({
                  ...child,
                  color: newColor
                  // All other properties including borderColor and borderWidth are preserved
                }))
              };
            } else {
              return { ...element, color: newColor };
            }
          }
          return element;
        })
      );
    } else if (selectedId) {
      // Change color of single selected element - use direct state update for groups too
      setLayoutElements(prev => 
        prev.map(element => {
          if (element.id === selectedId) {
            if (element.type === 'merged' && element.children) {
              // For merged objects, update both the element color and all children colors
              return {
                ...element,
                color: newColor,
                children: element.children.map(child => ({
                  ...child,
                  color: newColor
                }))
              };
            } else if (element.type === 'group' && element.children) {
              // For group objects, update all children colors (preserve border properties)
              return {
                ...element,
                color: newColor,
                children: element.children.map(child => ({
                  ...child,
                  color: newColor
                  // All other properties including borderColor and borderWidth are preserved
                }))
              };
            } else {
              return { ...element, color: newColor };
            }
          }
          return element;
        })
      );
    }
    setShowColorPicker(false);
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement, layoutElements]);

  // Clear border for selected elements
  const toggleElementBorder = useCallback(() => {
    if (isMultiSelect && selectedIds.length > 0) {
      // Clear borders for all selected elements
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            if (element.type === 'group' && element.children) {
              // For group objects, clear borders for all children
              return {
                ...element,
                borderWidth: 0,
                borderColor: 'transparent',
                children: element.children.map(child => ({
                  ...child,
                  borderWidth: 0,
                  borderColor: 'transparent'
                }))
              };
            } else {
              return {
                ...element,
                borderWidth: 0,
                borderColor: 'transparent'
              };
            }
          }
          return element;
        })
      );
    } else if (selectedId) {
      // Clear border for single selected element
      const element = layoutElements.find(el => el.id === selectedId);
      if (element) {
        if (element.type === 'group' && element.children) {
          // For group objects, clear borders for all children
          updateElement(selectedId, {
            borderWidth: 0,
            borderColor: 'transparent',
            children: element.children.map(child => ({
              ...child,
              borderWidth: 0,
              borderColor: 'transparent'
            }))
          });
        } else {
          updateElement(selectedId, { 
            borderWidth: 0,
            borderColor: 'transparent'
          });
        }
      }
    }
    
    // Clear UI state as well
    setSelectedBorderWidth(0);
    setSelectedBorderColor(null);
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement, layoutElements]);

  // Change border width
  const changeBorderWidth = useCallback((width) => {
    if (isMultiSelect && selectedIds.length > 0) {
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            if (element.type === 'group' && element.children) {
              // For group objects, update border width for all children (preserve main colors)
              return {
                ...element,
                borderWidth: width,
                borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6'),
                children: element.children.map(child => ({
                  ...child,
                  borderWidth: width,
                  borderColor: width === 0 ? undefined : (child.borderColor || '#3b82f6')
                  // Note: child.color (main color) is preserved via spread operator
                }))
              };
            } else {
              return { 
                ...element, 
                borderWidth: width,
                // If setting width to 0, clear border color to avoid black remnants
                // If setting width > 0, ensure there's a visible border color
                borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6')
              };
            }
          }
          return element;
        })
      );
    } else if (selectedId) {
      const element = layoutElements.find(el => el.id === selectedId);
      if (element) {
        if (element.type === 'group' && element.children) {
          // For group objects, update border width for all children
          updateElement(selectedId, {
            borderWidth: width,
            borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6'),
            children: element.children.map(child => ({
              ...child,
              borderWidth: width,
              borderColor: width === 0 ? undefined : (child.borderColor || '#3b82f6')
            }))
          });
        } else {
          updateElement(selectedId, { 
            borderWidth: width,
            // If setting width to 0, clear border color to avoid black remnants
            // If setting width > 0, ensure there's a visible border color
            borderColor: width === 0 ? undefined : (element.borderColor || '#3b82f6')
          });
        }
      }
    }
    setHasUnsavedChanges(true);
  }, [selectedId, selectedIds, isMultiSelect, updateElement, layoutElements]);

  // Change border color
  const changeBorderColor = useCallback((color) => {
    if (isMultiSelect && selectedIds.length > 0) {
      setLayoutElements(prev => 
        prev.map(element => {
          if (selectedIds.includes(element.id)) {
            if (element.type === 'group' && element.children) {
              // For group objects, update only border colors of children (preserve other properties)
              return {
                ...element,
                borderColor: color,
                children: element.children.map(child => ({
                  ...child,
                  borderColor: color
                  // Explicitly preserve the child's original color property
                }))
              };
            } else {
              return { ...element, borderColor: color };
            }
          }
          return element;
        })
      );
    } else if (selectedId) {
      // Change border color of single selected element - use direct state update for groups too
      setLayoutElements(prev => 
        prev.map(element => {
          if (element.id === selectedId) {
            if (element.type === 'group' && element.children) {
              // For group objects, update only border colors of children (preserve other properties)
              return {
                ...element,
                borderColor: color,
                children: element.children.map(child => ({
                  ...child,
                  borderColor: color
                  // Explicitly preserve the child's original color property
                }))
              };
            } else {
              return { ...element, borderColor: color };
            }
          }
          return element;
        })
      );
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
      children: elementsToGroup.map(element => {
        // Calculate proper relative position based on element's visual bounds
        const bounds = getElementVisualBounds(element);
        // For centered elements, calculate offset from their visual center to group origin
        const relativeX = element.x - minX;
        const relativeY = element.y - minY;
        
        return {
          ...element,
          x: relativeX,
          y: relativeY,
        };
      }),
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

  // Merge selected elements into a single element
  const mergeElements = useCallback(() => {
    if (selectedIds.length < 2) {
      return;
    }

    const elementsToMerge = layoutElements.filter(element => selectedIds.includes(element.id));
    
    // Calculate bounding box for the merged element
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elementsToMerge.forEach(element => {
      const bounds = getElementVisualBounds(element);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    const mergedId = `merged_${Date.now()}`;
    
    // Combine text only from text elements
    const combinedText = elementsToMerge
      .filter(el => el.type === 'text' && el.text && el.text.trim())
      .map(el => el.text.trim())
      .join(' ');

    // Use the most common border properties from elements that have borders
    const bordersWithWidth = elementsToMerge.filter(el => el.borderWidth && el.borderWidth > 0);
    // Start with no border by default - user can add border later if needed
    const borderWidth = bordersWithWidth.length > 0 ? bordersWithWidth[0].borderWidth : 0;
    const borderColor = bordersWithWidth.length > 0 ? bordersWithWidth[0].borderColor : '#374151';

    // Calculate the outline path that follows the actual perimeter
    const outlinePath = calculateMergedOutlinePath(elementsToMerge, minX, minY);

    // Create merged element that contains all the original elements as children
    const mergedElement = {
      id: mergedId,
      type: 'merged', // Special type for merged elements
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      color: 'transparent', // Merged container is transparent
      label: 'Merged',
      rotation: 0,
      text: combinedText || null,
      borderWidth: borderWidth,
      borderColor: borderColor,
      outlinePath: outlinePath, // Store the calculated outline path
      // Store original elements as children with relative coordinates
      children: elementsToMerge.map(element => ({
        ...element,
        // Convert to relative coordinates within the merged container
        x: element.x - minX,
        y: element.y - minY,
        // Hide text from non-text elements when merged, but preserve original
        originalText: element.text, // Store original text for restoration
        text: element.type === 'text' ? element.text : null,
      })),
      // Mark as merged for special rendering
      isMerged: true,
    };

    // Remove individual elements and add merged element
    setLayoutElements(prev => [
      ...prev.filter(element => !selectedIds.includes(element.id)),
      mergedElement
    ]);
    
    // Select the new merged element
    setSelectedId(mergedId);
    setSelectedIds([]);
    setIsMultiSelect(false);
    setTempGroupBounds(null);
    setHasUnsavedChanges(true);
  }, [selectedIds, layoutElements, getElementVisualBounds]);

  // Unmerge selected merged element back into its original components
  const unmergeElements = useCallback(() => {
    if (!selectedId) {
      return;
    }

    const mergedElement = layoutElements.find(element => element.id === selectedId);
    if (!mergedElement || mergedElement.type !== 'merged') {
      return;
    }

    console.log('Unmerging element:', mergedElement);

    // Convert child elements back to absolute coordinates and preserve merged element's styling
    const restoredElements = mergedElement.children.map(child => ({
      ...child,
      // Convert back to absolute coordinates
      x: child.x + mergedElement.x,
      y: child.y + mergedElement.y,
      // Preserve the merged element's color and border properties
      color: mergedElement.color !== 'transparent' ? mergedElement.color : child.color,
      borderWidth: mergedElement.borderWidth || child.borderWidth,
      borderColor: mergedElement.borderColor || child.borderColor,
      // Restore original text for all elements
      text: child.originalText || child.text,
      // Remove the temporary originalText property
      originalText: undefined,
    }));

    // Remove the merged element and restore the original elements
    setLayoutElements(prev => [
      ...prev.filter(element => element.id !== selectedId),
      ...restoredElements
    ]);

    // Select the first restored element
    if (restoredElements.length > 0) {
      setSelectedId(restoredElements[0].id);
    } else {
      setSelectedId(null);
    }
    setSelectedIds([]);
    setIsMultiSelect(false);
    setTempGroupBounds(null);
    setHasUnsavedChanges(true);
  }, [selectedId, layoutElements]);

  // Element Duplication Functions
  
  // Generate label text based on configuration (numbers only)
  const generateLabel = useCallback((index, config) => {
    const { startValue, endValue, increment, duplicateCount } = config;
    
    // Calculate actual count needed
    const actualCount = parseInt(duplicateCount) || 1;
    const start = parseInt(startValue) || 1;
    const end = parseInt(endValue) || start + actualCount - 1;
    const totalRange = Math.abs(end - start) + 1;
    
    // Normal sequential labeling when count >= range
    if (actualCount >= totalRange) {
      return String(start + (index * increment));
    }
    
    // When count < total range, create a sequence like: 1, 2, 3, ..., 17, 18, 19, 20
    if (actualCount <= 3) {
      // For very small counts, just show sequential from start
      return String(start + (index * increment));
    }
    
    // Calculate how many numbers to show at start and end
    const numbersAtStart = Math.ceil((actualCount - 1) / 2); // First half (excluding ...)
    const numbersAtEnd = actualCount - numbersAtStart - 1;   // Last half (excluding ...)
    const ellipsisIndex = numbersAtStart;                   // Position of ...
    
    if (index < numbersAtStart) {
      // Show first few numbers: 1, 2, 3, 4
      return String(start + (index * increment));
    } else if (index === ellipsisIndex) {
      // Show "..." in the middle
      return '...';
    } else {
      // Show last few numbers: 17, 18, 19, 20
      const endPosition = index - ellipsisIndex - 1; // Position within end numbers (0-based)
      return String(end - ((numbersAtEnd - 1 - endPosition) * increment));
    }
  }, []);

  // Calculate position based on direction and gap
  const calculateDuplicatePosition = useCallback((originalElement, index, config) => {
    const { direction, gap } = config;
    let deltaX = 0;
    let deltaY = 0;
    
    switch (direction) {
      case 'right':
        deltaX = (originalElement.width + gap) * (index + 1);
        break;
      case 'left':
        deltaX = -(originalElement.width + gap) * (index + 1);
        break;
      case 'down':
        deltaY = (originalElement.height + gap) * (index + 1);
        break;
      case 'up':
        deltaY = -(originalElement.height + gap) * (index + 1);
        break;
    }
    
    return {
      x: originalElement.x + deltaX,
      y: originalElement.y + deltaY,
    };
  }, []);

  // Open duplication modal
  const openDuplicationModal = useCallback(() => {
    // Check if any element is actually selected
    const hasSelection = selectedId || (isMultiSelect && selectedIds.length > 0);

    if (!hasSelection) {
      console.log('❌ No elements selected - showing alert');
      alert('Please select an element to duplicate. Click on an element first, then click Duplicate.');
      return;
    }

    setShowDuplicationModal(true);
  }, [selectedId, isMultiSelect, selectedIds, layoutElements]);

  // Apply duplication
  const applyDuplication = useCallback(() => {
    console.log('applyDuplication called', { selectedId, isMultiSelect, selectedIds, duplicationConfig });
    
    if (!selectedId && (!isMultiSelect || selectedIds.length === 0)) {
      console.log('No elements selected for duplication');
      return;
    }
    
    // Get elements to duplicate
    const elementsToDuplicate = selectedId 
      ? [layoutElements.find(el => el.id === selectedId)]
      : layoutElements.filter(el => selectedIds.includes(el.id));
    
    
    if (elementsToDuplicate.length === 0 || elementsToDuplicate.some(el => !el)) {
      console.log('No valid elements found for duplication');
      return;
    }
    
    const { duplicateCount } = duplicationConfig;
    const newElements = [];
    const modifiedElements = [];
        
    // Calculate all positions first to determine if resizing is needed
    const allPositions = [];
    elementsToDuplicate.forEach((originalElement) => {
      for (let i = 0; i < duplicateCount; i++) {
        const newPosition = calculateDuplicatePosition(originalElement, i, duplicationConfig);
        allPositions.push({
          x: newPosition.x,
          y: newPosition.y,
          width: originalElement.width,
          height: originalElement.height
        });
      }
    });
    
    // Check if elements exceed page boundaries
    const maxX = Math.max(...allPositions.map(pos => pos.x + pos.width));
    const maxY = Math.max(...allPositions.map(pos => pos.y + pos.height));
    const currentPageWidth = currentPreset.width;
    const currentPageHeight = currentPreset.height;
    
    // Calculate scale factor if needed
    let scaleFactor = 1;
    if (maxX > currentPageWidth || maxY > currentPageHeight) {
      const scaleX = currentPageWidth / maxX;
      const scaleY = currentPageHeight / maxY;
      scaleFactor = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to leave some margin
    }
    
    // Create duplicated elements (including original)
    for (let i = 0; i < duplicateCount; i++) {
      const label = generateLabel(i, duplicationConfig);
      
      elementsToDuplicate.forEach((originalElement) => {
        const newPosition = calculateDuplicatePosition(originalElement, i, duplicationConfig);
        console.log('New position for element', originalElement.id, ':', newPosition);
        
        // Apply scaling if needed
        const scaledWidth = originalElement.width * scaleFactor;
        const scaledHeight = originalElement.height * scaleFactor;
        const scaledX = newPosition.x * scaleFactor;
        const scaledY = newPosition.y * scaleFactor;
        
        if (i === 0) {
          // Modify the original element to display the number as text on it
          const modifiedElement = {
            ...originalElement,
            x: scaledX,
            y: scaledY,
            width: scaledWidth,
            height: scaledHeight,
            text: label, // Add the number as text content displayed on the element
            fontSize: originalElement.fontSize || 16,
          };
          
          modifiedElements.push(modifiedElement);
          console.log('Modified original element with text:', modifiedElement);
        } else {
          // Create new duplicated elements keeping original type but adding number text
          const duplicatedElement = {
            ...originalElement,
            id: `${originalElement.id}_duplicate_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            x: scaledX,
            y: scaledY,
            width: scaledWidth,
            height: scaledHeight,
            text: label, // Add the number as text content displayed on the element
            fontSize: originalElement.fontSize || 16,
          };
          
          console.log('Created duplicated element with text:', duplicatedElement);
          newElements.push(duplicatedElement);
        }
      });
    }
    // Update layout elements - replace originals and add new ones
    setLayoutElements(prev => {
      // Remove original elements and add modified + new elements
      const elementsToRemove = elementsToDuplicate.map(el => el.id);
      const filtered = prev.filter(el => !elementsToRemove.includes(el.id));
      const updated = [...filtered, ...modifiedElements, ...newElements];
      console.log('Updated layout elements:', updated);
      return updated;
    });
    setHasUnsavedChanges(true);
    // Close modal
    setShowDuplicationModal(false);
    // Group all duplicated elements (select them all)
    const allElementIds = [...modifiedElements.map(el => el.id), ...newElements.map(el => el.id)];
    if (allElementIds.length > 1) {
      setSelectedIds(allElementIds);
      setSelectedId(null);
      setIsMultiSelect(true);
      console.log('Grouped duplicated elements:', allElementIds);
    } else if (allElementIds.length === 1) {
      setSelectedId(allElementIds[0]);
      setSelectedIds([]);
      setIsMultiSelect(false);
    }
    
    console.log('Duplication completed');
  }, [selectedId, isMultiSelect, selectedIds, layoutElements, duplicationConfig, generateLabel, calculateDuplicatePosition, currentPreset]);

  // Cancel duplication
  const cancelDuplication = useCallback(() => {
    setShowDuplicationModal(false);
  }, []);

  // Update duplication config
  const updateDuplicationConfig = useCallback((updates) => {
    setDuplicationConfig(prev => ({ ...prev, ...updates }));
  }, []);


  const handlePageSizeChange = useCallback((preset) => {
    const newSize = pageSizePresets[preset];
    if (newSize) {
      setPageSize({ width: newSize.canvasWidth, height: newSize.canvasHeight });
      setPageSizePreset(preset);
      setHasUnsavedChanges(true);
    }
  }, [setHasUnsavedChanges]);

  const handleCustomPageSize = useCallback((width, height) => {
    const newWidth = Math.max(200, Math.min(3000, parseInt(width) || 800));
    const newHeight = Math.max(200, Math.min(3000, parseInt(height) || 600));
    
    // Calculate scaled canvas dimensions: canvasWidth=800, canvasHeight=800/originalWidth × originalHeight
    const canvasWidth = 800;
    const canvasHeight = Math.round((800 / newWidth) * newHeight);
    
    // Update the custom preset with new canvas dimensions
    pageSizePresets.custom = {
      ...pageSizePresets.custom,
      width: newWidth,
      height: newHeight,
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight
    };
    
    setPageSize({ width: canvasWidth, height: canvasHeight });
    setPageSizePreset('custom');
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

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
    
    // Merge/Unmerge shortcuts - Ctrl/Cmd + M
    if (isCtrlOrCmd && event.key.toLowerCase() === 'm') {
      event.preventDefault();
      if (event.shiftKey) {
        // Ctrl/Cmd + Shift + M = Unmerge
        unmergeElements();
      } else if (selectedIds.length > 1) {
        // Ctrl/Cmd + M = Merge
        mergeElements();
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
  }, [editingTextId, groupElements, ungroupElements, mergeElements, deleteElement, cutElements, copyElements, pasteElements, bringToFront, sendToBack, bringForward, sendBackward, selectedId, selectedIds, isMultiSelect, clipboard.length, layoutElements]);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside export dropdown
      if (showExportDropdown && !event.target.closest('[data-export-dropdown]')) {
        setShowExportDropdown(false);
      }
      // Check if click is outside style dropdown
      if (showStyleControls && !event.target.closest('[data-style-dropdown]')) {
        setShowStyleControls(false);
      }
      // Check if click is outside layer dropdown
      if (showLayerDropdown && !event.target.closest('[data-layer-dropdown]')) {
        setShowLayerDropdown(false);
      }
      // Check if click is outside page size dropdown
      if (showPageSizeControls && !event.target.closest('[data-pagesize-dropdown]')) {
        setShowPageSizeControls(false);
      }
      // Check if click is outside page size controls
      if (showPageSizeControls && !event.target.closest('[data-pagesize-dropdown]')) {
        setShowPageSizeControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showStyleControls, showLayerDropdown, showPageSizeControls]);

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
      
      // Create a temporary white background rectangle
      const backgroundRect = new window.Konva.Rect({
        x: 0,
        y: 0,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        fill: '#ffffff',
        listening: false,
        name: 'temp-background'
      });
      
      // Add background rectangle as the first element (bottom layer)
      layer.add(backgroundRect);
      backgroundRect.zIndex(0);
      
      layer.batchDraw();
      
      // Calculate bounding box of all layout elements
      if (layoutElements.length === 0) {
        alert('No elements to export');
        // Remove background rectangle and restore everything
        backgroundRect.destroy();
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
      
      // Export full canvas (800x600) with white background
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2
      });
      
      // Remove the temporary background rectangle
      backgroundRect.destroy();
      
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
      
      // Create a temporary white background rectangle
      const backgroundRect = new window.Konva.Rect({
        x: 0,
        y: 0,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        fill: '#ffffff',
        listening: false,
        name: 'temp-background'
      });
      
      // Add background rectangle as the first element (bottom layer)
      layer.add(backgroundRect);
      backgroundRect.zIndex(0);
      
      layer.batchDraw();
      
      // Check if there are any elements (optional warning)
      if (layoutElements.length === 0) {
        const proceed = window.confirm('No elements found. Export empty canvas?');
        if (!proceed) {
          // Remove background rectangle and restore everything
          backgroundRect.destroy();
          gridElements.forEach(element => element.visible(true));
          layer.batchDraw();
          return;
        }
      }
      
      // Export full canvas (800x600) with white background
      const dataURL = stageRef.current.toDataURL({ 
        pixelRatio: 2
      });
      
      // Remove the temporary background rectangle
      backgroundRect.destroy();
      
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
      } else {
        // Single element movement - update position in real-time so text follows
        updateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }
      
      // Show snap guides during drag if snap-to-grid is enabled
      if (snapToGrid) {
        const currentX = e.target.x();
        const currentY = e.target.y();
        const nearestGridPos = findNearestGridPosition(currentX, currentY);
        
        // Show guides if close enough to snap
        if (shouldSnapToPosition(currentX, currentY, nearestGridPos.x, nearestGridPos.y)) {
          setShowSnapGuides([
            { x: nearestGridPos.x, y: 0, width: 1, height: 600 }, // Vertical guide
            { x: 0, y: nearestGridPos.y, width: 800, height: 1 }   // Horizontal guide
          ]);
        } else {
          setShowSnapGuides([]);
        }
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
        
        // Apply snap-to-grid for group movement
        const draggedElementPosition = findNearestGridPosition(e.target.x(), e.target.y());
        const actualDeltaX = draggedElementPosition.x - element.x;
        const actualDeltaY = draggedElementPosition.y - element.y;
        
        // Final position update for all elements in the group
        setLayoutElements(prev => 
          prev.map(el => {
            if (selectedIds.includes(el.id)) {
              if (el.id === element.id) {
                // Update the dragged element to its snapped position
                return {
                  ...el,
                  x: draggedElementPosition.x,
                  y: draggedElementPosition.y,
                };
              } else if (initialPositions?.[el.id]) {
                // Update other elements relative to their initial positions with snapping
                const newPosition = findNearestGridPosition(
                  initialPositions[el.id].x + actualDeltaX,
                  initialPositions[el.id].y + actualDeltaY
                );
                return {
                  ...el,
                  x: newPosition.x,
                  y: newPosition.y,
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
        // Single element movement with snap-to-grid
        const snappedPosition = findNearestGridPosition(e.target.x(), e.target.y());
        updateElement(element.id, {
          x: snappedPosition.x,
          y: snappedPosition.y,
        });
      }
      
      // Clear snap guides after drag ends
      setShowSnapGuides([]);
    };

    const handleTransformEnd = (e) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // Only proceed if there was actual scaling
      if (scaleX === 1 && scaleY === 1) return;
      
      // Check if this is a group element
      if (element.type === 'group') {
        // For groups, we need to scale the children as well
        const newWidth = Math.max(5, node.width() * scaleX);
        const newHeight = Math.max(5, node.height() * scaleY);
        
        // Scale all children proportionally
        const scaledChildren = element.children.map(child => ({
          ...child,
          x: child.x * scaleX,
          y: child.y * scaleY,
          width: child.width * scaleX,
          height: child.height * scaleY,
          // Scale font size for text elements
          fontSize: child.type === 'text' && child.fontSize ? child.fontSize * Math.min(scaleX, scaleY) : child.fontSize
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
      
      // Reset scale after applying the changes
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
      // Prevent stroke from being affected by transforms
      strokeScaleEnabled: false,
      // For merged objects with borders, ensure the border is visible
      perfectDrawEnabled: false,
      // For merged objects, use 'outside' stroke positioning if supported
      ...(element.isMerged && element.borderWidth > 0 && {
        lineCap: 'round',
        lineJoin: 'round',
      }),
      draggable: true,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransformEnd: handleTransformEnd,
      onClick: (e) => handleSelect(element.id, e.evt),
      onTap: (e) => handleSelect(element.id, e.evt),
      rotation: element.rotation || 0,
      opacity: 1,
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
      // Render grouped elements by showing their actual children
      shape = (
        <Group
          {...shapeProps}
          onDblClick={() => startTextEdit(element.id)}
          onDblTap={() => startTextEdit(element.id)}
        >
          {/* Render the actual child elements within the group */}
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
              listening: true, // Allow children to be interactive
              onClick: (e) => {
                e.cancelBubble = true; // Prevent event from bubbling to group
                handleSelect(element.id, e.evt); // Select the group
              },
              onDblClick: (e) => {
                e.cancelBubble = true; // Prevent event from bubbling to group
                // Create a temporary child element ID for text editing
                const childElementId = `${element.id}_child_${child.id}`;
                startTextEdit(childElementId, child);
              },
            };
            
            let childShape;
            
            if (child.type === 'round') {
              childShape = (
                <Circle 
                  {...childProps} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'ellipse') {
              childShape = (
                <Ellipse 
                  {...childProps} 
                  radiusX={child.width / 2} 
                  radiusY={child.height / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'triangle') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={3} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'pentagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={5} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'hexagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={6} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'octagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={8} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'star') {
              childShape = (
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
              childShape = (
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
              childShape = (
                <Line 
                  {...childProps} 
                  points={[0, 0, child.width, 0]} 
                  stroke={child.color} 
                  strokeWidth={child.height || 2}
                  fill={undefined}
                />
              );
            } else if (child.type === 'text') {
              childShape = (
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
              childShape = <Rect {...childProps} />;
            }
            
            return (
              <React.Fragment key={child.id}>
                {childShape}
                {child.type !== 'text' && child.type !== 'line' && child.text && (
                  <Text
                    x={
                      // For centered shapes (circles, polygons, stars, arcs), x is already the center
                      ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(child.type)
                        ? child.x
                        : child.x + child.width / 2  // For rectangles, x is top-left, so add half width
                    }
                    y={
                      // For centered shapes, y is already the center
                      ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(child.type)
                        ? child.y
                        : child.y + child.height / 2  // For rectangles, y is top-left, so add half height
                    }
                    text={child.text}
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
          })}
          
          {/* Optional: Add a subtle group border when selected */}
          {isSelected && (
            <Rect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              fill="transparent"
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.6}
              listening={false}
            />
          )}
        </Group>
      );
    } else if (element.type === 'merged') {
      // Special rendering for merged elements - shows all children as a single unit
      const handleMergedDragMove = (e) => {
        // Update the merged element position in real-time during dragging
        updateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      };
      
      const handleMergedDragEnd = (e) => {
        const deltaX = e.target.x() - element.x;
        const deltaY = e.target.y() - element.y;
        
        // Update the merged element position
        updateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      };

      const mergedProps = {
        key: element.id,
        id: element.id,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        draggable: true,
        onDragMove: handleMergedDragMove,
        onDragEnd: handleMergedDragEnd,
        onTransform: (e) => {
          // Live update during merged element transform
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          
          // Update merged container size in real-time
          node.width(element.width * scaleX);
          node.height(element.height * scaleY);
          node.scaleX(1);
          node.scaleY(1);
        },
        onTransformEnd: handleTransformEnd,
        onClick: (e) => handleSelect(element.id, e.evt),
        onTap: (e) => handleSelect(element.id, e.evt),
      };

      // Render merged element as a group containing all original shapes
      shape = (
        <Group {...mergedProps}>
          {/* Invisible selection area */}
          <Rect
            width={element.width}
            height={element.height}
            fill="transparent"
            listening={true}
          />
          {/* Render all children shapes */}
          {element.children && element.children.map(child => {
            const childProps = {
              key: child.id,
              x: child.x,
              y: child.y,
              width: child.width,
              height: child.height,
              fill: child.color,
              stroke: 'transparent', // Remove individual borders for merged objects
              strokeWidth: 0, // Remove individual borders for merged objects
              listening: false, // Children don't handle interactions in merged state
            };
            
            let childShape;
            
            if (child.type === 'round') {
              childShape = (
                <Circle 
                  {...childProps} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'ellipse') {
              childShape = (
                <Ellipse 
                  {...childProps} 
                  radiusX={child.width / 2}
                  radiusY={child.height / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'triangle') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={3} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'pentagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={5} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'hexagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={6} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'octagon') {
              childShape = (
                <RegularPolygon 
                  {...childProps} 
                  sides={8} 
                  radius={child.width / 2}
                  width={undefined}
                  height={undefined}
                />
              );
            } else if (child.type === 'star') {
              childShape = (
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
              childShape = (
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
              childShape = (
                <Line 
                  {...childProps} 
                  points={[0, 0, child.width, 0]} 
                  stroke={child.color} 
                  strokeWidth={child.height || 2}
                  fill={undefined}
                />
              );
            } else if (child.type === 'text') {
              childShape = (
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
              // Default rectangle
              childShape = <Rect {...childProps} />;
            }
            
            return (
              <React.Fragment key={child.id}>
                {childShape}
                {child.type !== 'text' && child.type !== 'line' && child.text && (
                  <Text
                    x={
                      ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(child.type)
                        ? child.x
                        : child.x + child.width / 2
                    }
                    y={
                      ['round', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'arc'].includes(child.type)
                        ? child.y
                        : child.y + child.height / 2
                    }
                    text={child.text}
                    fontSize={12}
                    fill="white"
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    width={80}
                    height={24}
                    offsetX={40}
                    offsetY={12}
                    listening={false}
                    shadowColor="rgba(0, 0, 0, 0.5)"
                    shadowBlur={2}
                  />
                )}
              </React.Fragment>
            );
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
        {/* For merged objects with borders, render the border following the actual outline */}
        {element.isMerged && element.type === 'merged' && element.borderWidth > 0 && element.borderColor && element.outlinePath && (
          <Path
            x={element.x}
            y={element.y}
            data={element.outlinePath}
            fill="transparent"
            stroke={element.borderColor}
            strokeWidth={element.borderWidth}
            strokeScaleEnabled={false}
            listening={false}
          />
        )}
        {/* Fallback to rectangular border if no outline path is available */}
        {element.isMerged && element.type === 'merged' && element.borderWidth > 0 && element.borderColor && !element.outlinePath && (
          <Rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill="transparent"
            stroke={element.borderColor}
            strokeWidth={element.borderWidth}
            strokeScaleEnabled={false}
            listening={false}
          />
        )}
        {/* Render the main shape (with border removed for merged objects) */}
        {React.cloneElement(shape, element.isMerged && element.type === 'merged' && element.borderWidth > 0 ? {
          // No need to modify merged elements since they render children directly
        } : element.isMerged && element.borderWidth > 0 ? {
          stroke: 'transparent',
          strokeWidth: 0
        } : {})}
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
    <div className="layout-designer" style={{ height: `100%` }}>
      {/* Toolbar */}
      <div className="layout-toolbar" style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                const confirmLeave = window.confirm(
                  'You have unsaved changes that will be lost. Are you sure you want to go back to the event page?'
                );
                if (confirmLeave) {
                  navigate(`/events/${id}`);
                }
              } else {
                navigate(`/events/${id}`);
              }
            }}
            style={{
              ...styles.backLink,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            ← Back to Event
          </button>
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
                backgroundColor:'white'
              }}
              autoComplete="off"
            />
          )}

          {!(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
            <>
              <button 
                onClick={saveLayout}
                disabled={isSaving}
                className="btn btn-primary btn-small"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              
              {/* Page Size Controls */}
              <div style={{ position: 'relative', display: 'inline-block' }} data-pagesize-dropdown>
                <button 
                  onClick={() => setShowPageSizeControls(!showPageSizeControls)}
                  className="btn btn-small"
                  title="Adjust page size"
                  style={{
                    backgroundColor: showPageSizeControls ? '#3b82f6' : '#f3f4f6',
                    color: showPageSizeControls ? 'white' : '#374151',
                    border: `1px solid ${showPageSizeControls ? '#2563eb' : '#d1d5db'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s ease',
                    height: '26px'
                  }}
                >
                  📐 Page Size
                  {/* 📐 {pageSize.width} × {pageSize.height} */}
                </button>

                {showPageSizeControls && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '280px',
                    padding: '12px'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#374151' }}>
                      Page Size
                    </div>
                    
                    {/* Preset Selection */}
                    <div style={{ marginBottom: '12px' }}>
                      <select
                        value={pageSizePreset}
                        onChange={(e) => handlePageSizeChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px'
                        }}
                      >
                        <option value="custom">Custom</option>
                        {Object.entries(pageSizePresets).map(([key, preset]) => {
                          if (key === 'custom') return null;
                          return (
                            <option key={key} value={key}>
                              {preset.label} ({preset.width} × {preset.height})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Custom Dimensions */}
                    {pageSizePreset === 'custom' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                            Width
                          </label>
                          <input
                            type="number"
                            min="200"
                            max="3000"
                            value={pageSize.width}
                            onChange={(e) => handleCustomPageSize(e.target.value, pageSize.height)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <div style={{ padding: '0 4px', color: '#6b7280', fontSize: '12px' }}>×</div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                            Height
                          </label>
                          <input
                            type="number"
                            min="200"
                            max="3000"
                            value={pageSize.height}
                            onChange={(e) => handleCustomPageSize(pageSize.width, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Export Dropdown */}
              <div style={{ position: 'relative', display: 'inline-block' }} data-export-dropdown data-prevent-deselect="true">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="btn btn-secondary btn-small"
                  style={{
                    backgroundColor: showExportDropdown ? '#374151' : '',
                    color: showExportDropdown ? 'white' : '',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📥 Export ▾
                </button>
                
                {showExportDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '140px',
                    marginTop: '4px'
                  }}>
                    <button
                      onClick={() => {
                        exportToPNG();
                        setShowExportDropdown(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderRadius: '6px 6px 0 0'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      📷 Export PNG
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowExportDropdown(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderRadius: '0 0 6px 6px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      📄 Export PDF
                    </button>
                  </div>
                )}
              </div>
              
              {/* Paste button - always available when clipboard has content */}
              {clipboard.length > 0 && (
                <button 
                  onClick={pasteElements}
                  className="btn btn-info btn-small"
                  title="Paste elements (Ctrl+V)"
                >
                  Paste
                </button>
              )}
              
              <button 
                onClick={clearLayout}
                className="btn btn-danger btn-small"
              >
                Clear All
              </button>
            </>
          )}

          {(selectedId || (isMultiSelect && selectedIds.length > 0)) && (
            <div data-prevent-deselect="true" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {console.log('CONTROLS VISIBLE:', { selectedId, isMultiSelect, selectedIdsLength: selectedIds.length })}
              {/* Combined Style Controls Dropdown */}
              <div style={{ position: 'relative', display: 'inline-block' }} data-style-dropdown data-prevent-deselect="true">
                <button 
                  onClick={() => setShowStyleControls(!showStyleControls)}
                  className="btn btn-info btn-small"
                  title="Style settings - Change color and borders for selected objects"
                  style={{
                    backgroundColor: showStyleControls ? '#3b82f6' : '',
                    color: showStyleControls ? 'white' : '',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🎨 Style ▾
                </button>
                
                {showStyleControls && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '200px',
                    marginTop: '4px',
                    padding: '12px'
                  }}>
                    {/* Color Section */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '6px', display: 'block' }}>Color:</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', justifyContent: 'center', justifyItems: 'center' }}>
                        {colorOptions.slice(0, 10).map((color, index) => {
                          const isSelected = selectedColor === color;
                          
                          return (
                            <div
                              key={index}
                              style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: color,
                                border: color === '#ffffff' ? '2px solid #e5e7eb' : 
                                        isSelected ? '2px solid #374151' : '2px solid transparent',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => {
                                changeElementColor(color);
                                setSelectedColor(color);
                              }}
                              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              title={color}
                            />
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Border Section */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>Border:</label>
                        <button 
                          onClick={() => {
                            toggleElementBorder();
                          }}
                          style={{
                            padding: '3px 6px',
                            fontSize: '10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '3px',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          Clear
                        </button>
                      </div>
                      
                      {/* Border Width */}
                      <div style={{ marginBottom: '8px' }}>
                        {/* <span style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Width:</span> */}
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {/* No Border Option */}
                          <button
                            onClick={() => {
                              changeBorderWidth(0);
                              setSelectedBorderWidth(0);
                            }}
                            style={{
                              padding: '8px 6px',
                              fontSize: '10px',
                              border: selectedBorderWidth === 0 ? '1px solid #3b82f6' : '1px solid #d1d5db',
                              borderRadius: '3px',
                              backgroundColor: selectedBorderWidth === 0 ? '#dbeafe' : 'white',
                              cursor: 'pointer',
                              minWidth: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '1px',
                                backgroundColor: '#d1d5db',
                                position: 'relative'
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%) rotate(45deg)',
                                  width: '14px',
                                  height: '1px',
                                  backgroundColor: '#ef4444'
                                }}
                              />
                            </div>
                          </button>
                          {[1, 2, 3, 4, 5].map(width => {
                            const isSelected = selectedBorderWidth === width;
                            
                            return (
                              <button
                                key={width}
                                onClick={() => {
                                  changeBorderWidth(width);
                                  setSelectedBorderWidth(width);
                                }}
                                style={{
                                  padding: '8px 6px',
                                  fontSize: '10px',
                                  border: isSelected ? '1px solid #3b82f6' : '1px solid #d1d5db',
                                  borderRadius: '3px',
                                  backgroundColor: isSelected ? '#dbeafe' : 'white',
                                  cursor: 'pointer',
                                  minWidth: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div
                                  style={{
                                    width: '12px',
                                    height: `${width}px`,
                                    backgroundColor: '#374151',
                                    borderRadius: width > 2 ? '1px' : '0'
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Border Color */}
                      <div>
                        {/* <span style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Color:</span> */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', justifyContent: 'center', justifyItems: 'center' }}>
                          {['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6b7280', '#ec4899', '#84cc16'].map((color, index) => {
                            const isSelected = selectedBorderColor === color;
                            
                            return (
                              <div
                                key={index}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  backgroundColor: color,
                                  border: color === '#ffffff' ? '2px solid #e5e7eb' : 
                                          isSelected ? '2px solid #374151' : '2px solid transparent',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => {
                                  changeBorderColor(color);
                                  setSelectedBorderColor(color);
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                title={`Border: ${color}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Layer management dropdown */}
              <div style={{ position: 'relative', display: 'inline-block' }} data-layer-dropdown data-prevent-deselect="true">
                <button 
                  onClick={() => setShowLayerDropdown(!showLayerDropdown)}
                  className="btn btn-info btn-small"
                  title="Layer management - Arrange element layers"
                  style={{
                    backgroundColor: showLayerDropdown ? '#3b82f6' : '',
                    color: showLayerDropdown ? 'white' : '',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fa-solid fa-layer-group"></i> Layers ▾
                </button>
                
                {showLayerDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '50px',
                    marginTop: '4px'
                  }}>
                    <button
                      onClick={() => {
                        bringToFront();
                        setShowLayerDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderRadius: '6px 6px 0 0'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      title="Bring to front - Move selected objects to the top layer"
                    >
                      <Icon path={mdiArrangeBringToFront} size={0.7} /> Most Front
                    </button>
                    <button
                      onClick={() => {
                        bringForward();
                        setShowLayerDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      title="Bring forward - Move selected objects up one layer (Ctrl+])"
                    >
                      <Icon path={mdiArrangeBringForward} size={0.7} /> Forward
                    </button>
                    <button
                      onClick={() => {
                        sendBackward();
                        setShowLayerDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      title="Send backward - Move selected objects down one layer (Ctrl+[)"
                    >
                      <Icon path={mdiArrangeSendBackward} size={0.7} /> Backward
                    </button>
                    <button
                      onClick={() => {
                        sendToBack();
                        setShowLayerDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderRadius: '0 0 6px 6px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      title="Send to back - Move selected objects to the bottom layer"
                    >
                      <Icon path={mdiArrangeSendToBack} size={0.7} /> Most Back
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                onClick={openDuplicationModal}
                className="btn btn-success btn-small"
                title="Duplicate element with numbering"
                data-prevent-deselect="true"
              >
                Auto-Number
              </button>
              
              <button 
                onClick={cutElements}
                className="btn btn-secondary btn-small"
                title="Cut selected elements (Ctrl+X)"
              >
                Cut
              </button>
              <button 
                onClick={copyElements}
                className="btn btn-secondary btn-small"
                title="Copy selected elements (Ctrl+C)"
              >
                Copy
              </button>
              {clipboard.length > 0 && (
                <button 
                  onClick={pasteElements}
                  className="btn btn-info btn-small"
                  title="Paste elements (Ctrl+V)"
                >
                  Paste
                </button>
              )}
              <button 
                onClick={deleteElement}
                className="btn btn-danger btn-small"
              >
                Delete
              </button>
            </div>
          )}
          {isMultiSelect && selectedIds.length > 1 && (
            <>
              <button 
                onClick={groupElements}
                className="btn btn-success btn-small"
                title="Group selected elements (Ctrl+G)"
              >
                Group
              </button>
              <button 
                onClick={mergeElements}
                className="btn btn-info btn-small"
                title="Merge selected elements into one (Ctrl+M)"
              >
                Merge
              </button>
            </>
          )}
          {selectedId && layoutElements.find(el => el.id === selectedId)?.type === 'group' && (
            <button 
              onClick={ungroupElements}
              className="btn btn-warning btn-small"
              title="Ungroup selected group (Ctrl+Shift+G)"
            >
              Ungroup
            </button>
          )}
          {selectedId && layoutElements.find(el => el.id === selectedId)?.type === 'merged' && (
            <button 
              onClick={unmergeElements}
              className="btn btn-warning btn-small"
              title="Unmerge selected merged element (Ctrl+Shift+M)"
            >
              Unmerge
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="layout-content" style={styles.content}>
        {/* Sidebar */}
        <div className="layout-sidebar" data-prevent-deselect="true" style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Layout Elements</h3>
              <div style={{ position: 'relative' }}>
                <div
                  onMouseEnter={() => setShowInfoHover(true)}
                  onMouseLeave={() => setShowInfoHover(false)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#e5e5e5ff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'help',
                    transition: 'all 0.2s ease'
                  }}
                >
                  i
                </div>
                
                {showInfoHover && (
                  <div style={{
                    position: 'absolute',
                    top: '25px',
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '280px',
                    padding: '12px',
                    fontSize: '12px',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Controls & Shortcuts</div>
                    <div style={{ color: '#6b7280' }}>
                      <div style={{ marginBottom: '4px' }}><strong>Edit Text:</strong> Double-click on text elements</div>
                      <div style={{ marginBottom: '4px' }}><strong>Multi-Select:</strong> Hold Shift + Click (creates temp group)</div>
                      <div style={{ marginBottom: '4px' }}><strong>Cut:</strong> Ctrl/Cmd + X</div>
                      <div style={{ marginBottom: '4px' }}><strong>Copy:</strong> Ctrl/Cmd + C</div>
                      <div style={{ marginBottom: '4px' }}><strong>Paste:</strong> Ctrl/Cmd + V</div>
                      <div style={{ marginBottom: '4px' }}><strong>Group:</strong> Ctrl/Cmd + G</div>
                      <div style={{ marginBottom: '4px' }}><strong>Merge:</strong> Ctrl/Cmd + M</div>
                      <div style={{ marginBottom: '4px' }}><strong>Ungroup:</strong> Ctrl/Cmd + Shift + G</div>
                      <div style={{ marginBottom: '4px' }}><strong>Delete:</strong> Delete or Backspace key</div>
                      <div style={{ marginBottom: '4px' }}><strong>Bring to Front:</strong> Ctrl/Cmd + Shift + ]</div>
                      <div style={{ marginBottom: '4px' }}><strong>Send to Back:</strong> Ctrl/Cmd + Shift + [</div>
                      <div style={{ marginBottom: '4px' }}><strong>Bring Forward:</strong> Ctrl/Cmd + ]</div>
                      <div style={{ marginBottom: '4px' }}><strong>Send Backward:</strong> Ctrl/Cmd + [</div>
                      <div style={{ marginBottom: '4px' }}><strong>Zoom In:</strong> Ctrl/Cmd + + or Mouse Wheel</div>
                      <div style={{ marginBottom: '4px' }}><strong>Zoom Out:</strong> Ctrl/Cmd + - or Mouse Wheel</div>
                      <div style={{ marginBottom: '4px' }}><strong>Fit to Canvas:</strong> Ctrl/Cmd + 0</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

          {/* Custom Elements Section */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeader}>
              <h3 style={{ margin: 0 }}>My Elements</h3>
              {/* Save button - only show when elements are selected */}
              {(() => {
                const elementsToSave = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
                return elementsToSave.length > 0 ? (
                  <button
                    onClick={() => {
                      console.log('Save button clicked!', { selectedIds, selectedId, elementsToSave });
                      setShowSaveElementDialog(true);
                    }}
                    style={{
                      ...styles.saveElementButton,
                      backgroundColor: '#10b981' // Green when shown
                    }}
                    title="Save selected elements as custom element"
                  >
                    💾 Save
                  </button>
                ) : null;
              })()}
            </div>
            
            {showCustomElementsPanel && (
              <div>
                {/* Search and Filter */}
                <div style={styles.filterContainer}>
                  <input
                    type="text"
                    placeholder="Search elements..."
                    value={customElementsFilter.search}
                    onChange={(e) => setCustomElementsFilter(prev => ({...prev, search: e.target.value}))}
                    style={styles.searchInput}
                  />

                </div>

                {/* Custom Elements Grid */}
                {isLoadingCustomElements ? (
                  <div style={styles.loadingContainer}>Loading...</div>
                ) : customElements.length > 0 ? (
                  <div style={styles.customElementGrid}>
                    {customElements.map((element) => {
                      return (
                        <div
                          key={element.element_id}
                          style={styles.customElementItem}
                          onClick={() => addCustomElementToLayout(element)}
                          title={element.name}
                        >
                        {element.thumbnail ? (
                          <img 
                            src={element.thumbnail} 
                            alt={element.name}
                            style={styles.elementThumbnail}
                            onError={(e) => {
                              // If thumbnail fails to load, show placeholder
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Mini Konva preview of the actual elements */}
                        <div 
                          style={{
                            width: '60px',
                            height: '60px',
                            display: element.thumbnail ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            backgroundColor: '#ffffff',
                            position: 'relative'
                          }}
                        >
                          <Stage 
                            width={60} 
                            height={60}
                            style={{ 
                              pointerEvents: 'none',
                              display: 'block'
                            }}
                          >
                            <Layer>
                              {element.element_data && element.element_data.elements && element.element_data.elements.length > 0 ? (
                                (() => {
                                  const elements = element.element_data.elements;
                                  
                                  // Handle merged elements specially
                                  if (elements.length === 1 && elements[0].type === 'merged' && elements[0].children) {
                                    const mergedChildren = elements[0].children;
                                    
                                    // Calculate bounds for merged children
                                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                    mergedChildren.forEach(child => {
                                      const x = child.x || 0;
                                      const y = child.y || 0;
                                      const w = child.width || 20;
                                      const h = child.height || 20;
                                      
                                      // Calculate proper bounds based on shape type
                                      if (child.type === 'round' || child.type === 'star' || child.type === 'arc' || 
                                          child.type === 'triangle' || child.type === 'pentagon' || child.type === 'hexagon' || 
                                          child.type === 'octagon') {
                                        // Centered shapes - x,y is the center point
                                        const radius = Math.max(w, h) / 2;
                                        minX = Math.min(minX, x - radius);
                                        minY = Math.min(minY, y - radius);
                                        maxX = Math.max(maxX, x + radius);
                                        maxY = Math.max(maxY, y + radius);
                                      } else {
                                        // Rectangle-based shapes - x,y is top-left corner
                                        minX = Math.min(minX, x);
                                        minY = Math.min(minY, y);
                                        maxX = Math.max(maxX, x + w);
                                        maxY = Math.max(maxY, y + h);
                                      }
                                    });
                                    
                                    const boundingWidth = Math.max(maxX - minX, 20);
                                    const boundingHeight = Math.max(maxY - minY, 20);
                                    const scale = Math.min(50 / boundingWidth, 50 / boundingHeight, 1);
                                    const offsetX = (60 - boundingWidth * scale) / 2;
                                    const offsetY = (60 - boundingHeight * scale) / 2;
                                                                        
                                    return mergedChildren.map((child, idx) => {
                                      // For centered shapes, adjust positioning
                                      let scaledX, scaledY;
                                      if (child.type === 'round' || child.type === 'star' || child.type === 'arc' || 
                                          child.type === 'triangle' || child.type === 'pentagon' || child.type === 'hexagon' || 
                                          child.type === 'octagon' ) {
                                        // Centered shapes - keep them centered
                                        scaledX = (child.x - minX) * scale + offsetX;
                                        scaledY = (child.y - minY) * scale + offsetY;
                                      } else {
                                        // Corner-based shapes
                                        scaledX = (child.x - minX) * scale + offsetX;
                                        scaledY = (child.y - minY) * scale + offsetY;
                                      }
                                      
                                      const scaledWidth = (child.width || 20) * scale;
                                      const scaledHeight = (child.height || 20) * scale;
                                      
                                      const hasValidBorder = child.borderWidth && child.borderWidth > 0;
                                      const borderColor = hasValidBorder ? (child.borderColor || '#000000') : 'transparent';
                                      // Make border more visible by ensuring contrast
                                      const effectiveBorderColor = hasValidBorder ? 
                                        (borderColor === 'transparent' || borderColor === child.color ? '#000000' : borderColor) : 'transparent';
                                      
                                      const props = {
                                        key: `merged-thumb-${idx}`,
                                        x: scaledX,
                                        y: scaledY,
                                        fill: child.color || '#9ca3af',
                                        stroke: effectiveBorderColor,
                                        strokeWidth: hasValidBorder ? Math.max(child.borderWidth * scale, 1.5) : 0,
                                        listening: false
                                      };
                                                                          
                                      // Render child shapes - handle ALL shape types
                                      if (child.type === 'arc') {
                                        return <Arc {...props} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} angle={180} />;
                                      } else if (child.type === 'star') {
                                        return <Star {...props} numPoints={5} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} />;
                                      } else if (child.type === 'round') {
                                        return <Circle {...props} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'ellipse') {
                                        return <Ellipse {...props} radiusX={scaledWidth / 2} radiusY={scaledHeight / 2} />;
                                      } else if (child.type === 'triangle') {
                                        return <RegularPolygon {...props} sides={3} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'pentagon') {
                                        return <RegularPolygon {...props} sides={5} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'hexagon') {
                                        return <RegularPolygon {...props} sides={6} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'octagon') {
                                        return <RegularPolygon {...props} sides={8} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'line') {
                                        return <Line {...props} points={[0, 0, scaledWidth, 0]} stroke={child.color || '#000000'} strokeWidth={Math.max((child.height || 2) * scale, 1)} fill={undefined} />;
                                      } else if (child.type === 'text') {
                                        return <Text {...props} text={(child.text || 'Text').substring(0, 8)} fontSize={Math.max((child.fontSize || 16) * scale, 8)} width={scaledWidth} height={scaledHeight} />;
                                      } else {
                                        // Default rectangle for square, rectangle, and unknown types
                                        return <Rect {...props} width={scaledWidth} height={scaledHeight} />;
                                      }
                                    });
                                  } else if (elements.length === 1 && elements[0].type === 'group' && elements[0].children) {
                                    // Handle grouped elements specially - render the children directly
                                    console.log('📋 Grouped element detected, using children');
                                    const groupedChildren = elements[0].children;
                                    console.log('🔍 Grouped children details:', groupedChildren.map(child => ({ type: child.type, borderWidth: child.borderWidth, borderColor: child.borderColor })));
                                    
                                    // Calculate bounds for grouped children (same logic as merged)
                                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                    groupedChildren.forEach(child => {
                                      const x = child.x || 0;
                                      const y = child.y || 0;
                                      const w = child.width || 20;
                                      const h = child.height || 20;
                                      
                                      // Calculate proper bounds based on shape type
                                      if (child.type === 'round' || child.type === 'star' || child.type === 'arc' || 
                                          child.type === 'triangle' || child.type === 'pentagon' || child.type === 'hexagon' || 
                                          child.type === 'octagon') {
                                        // Centered shapes - x,y is the center point
                                        const radius = Math.max(w, h) / 2;
                                        minX = Math.min(minX, x - radius);
                                        minY = Math.min(minY, y - radius);
                                        maxX = Math.max(maxX, x + radius);
                                        maxY = Math.max(maxY, y + radius);
                                      } else {
                                        // Rectangle-based shapes - x,y is top-left corner
                                        minX = Math.min(minX, x);
                                        minY = Math.min(minY, y);
                                        maxX = Math.max(maxX, x + w);
                                        maxY = Math.max(maxY, y + h);
                                      }
                                    });
                                    
                                    const boundingWidth = Math.max(maxX - minX, 20);
                                    const boundingHeight = Math.max(maxY - minY, 20);
                                    const scale = Math.min(50 / boundingWidth, 50 / boundingHeight, 1);
                                    const offsetX = (60 - boundingWidth * scale) / 2;
                                    const offsetY = (60 - boundingHeight * scale) / 2;
                                    
                                    console.log('📐 Grouped bounds:', { minX, minY, maxX, maxY, boundingWidth, boundingHeight, scale, offsetX, offsetY });
                                    
                                    return groupedChildren.map((child, idx) => {
                                      // For centered shapes, adjust positioning
                                      let scaledX, scaledY;
                                      if (child.type === 'round' || child.type === 'star' || child.type === 'arc' || 
                                          child.type === 'triangle' || child.type === 'pentagon' || child.type === 'hexagon' || 
                                          child.type === 'octagon' ) {
                                        // Centered shapes - keep them centered
                                        scaledX = (child.x - minX) * scale + offsetX;
                                        scaledY = (child.y - minY) * scale + offsetY;
                                      } else {
                                        // Corner-based shapes
                                        scaledX = (child.x - minX) * scale + offsetX;
                                        scaledY = (child.y - minY) * scale + offsetY;
                                      }
                                      
                                      const scaledWidth = (child.width || 20) * scale;
                                      const scaledHeight = (child.height || 20) * scale;
                                      
                                      const hasValidBorder = child.borderWidth && child.borderWidth > 0;
                                      const borderColor = hasValidBorder ? (child.borderColor || '#000000') : 'transparent';
                                      // Make border more visible by ensuring contrast
                                      const effectiveBorderColor = hasValidBorder ? 
                                        (borderColor === 'transparent' || borderColor === child.color ? '#000000' : borderColor) : 'transparent';
                                      
                                      const props = {
                                        key: `group-thumb-${idx}`,
                                        x: scaledX,
                                        y: scaledY,
                                        fill: child.color || '#9ca3af',
                                        stroke: effectiveBorderColor,
                                        strokeWidth: hasValidBorder ? Math.max(child.borderWidth * scale, 1.5) : 0,
                                        listening: false
                                      };
                                                                            
                                      // Render child shapes - handle ALL shape types
                                      if (child.type === 'arc') {
                                        return <Arc {...props} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} angle={180} />;
                                      } else if (child.type === 'star') {
                                        return <Star {...props} numPoints={5} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} />;
                                      } else if (child.type === 'round') {
                                        return <Circle {...props} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'ellipse') {
                                        return <Ellipse {...props} radiusX={scaledWidth / 2} radiusY={scaledHeight / 2} />;
                                      } else if (child.type === 'triangle') {
                                        return <RegularPolygon {...props} sides={3} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'pentagon') {
                                        return <RegularPolygon {...props} sides={5} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'hexagon') {
                                        return <RegularPolygon {...props} sides={6} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'octagon') {
                                        return <RegularPolygon {...props} sides={8} radius={scaledWidth / 2} />;
                                      } else if (child.type === 'line') {
                                        return <Line {...props} points={[0, 0, scaledWidth, 0]} stroke={child.color || '#000000'} strokeWidth={Math.max((child.height || 2) * scale, 1)} fill={undefined} />;
                                      } else if (child.type === 'text') {
                                        return <Text {...props} text={(child.text || 'Text').substring(0, 8)} fontSize={Math.max((child.fontSize || 16) * scale, 8)} width={scaledWidth} height={scaledHeight} />;
                                      } else {
                                        // Default rectangle for square, rectangle, and unknown types
                                        return <Rect {...props} width={scaledWidth} height={scaledHeight} />;
                                      }
                                    });
                                  } else {
                                    // Regular elements (non-merged)
                                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                    elements.forEach(el => {
                                      const x = el.x || 0;
                                      const y = el.y || 0;
                                      const w = el.width || 20;
                                      const h = el.height || 20;
                                      
                                      // Calculate proper bounds based on element type
                                      if (el.type === 'round' || el.type === 'star' || el.type === 'arc' || el.type === 'triangle' || el.type === 'pentagon' || el.type === 'hexagon' || el.type === 'octagon') {
                                        // Centered shapes
                                        const radius = Math.max(w, h) / 2;
                                        minX = Math.min(minX, x - radius);
                                        minY = Math.min(minY, y - radius);
                                        maxX = Math.max(maxX, x + radius);
                                        maxY = Math.max(maxY, y + radius);
                                      } else {
                                        // Rectangle-based shapes
                                        minX = Math.min(minX, x);
                                        minY = Math.min(minY, y);
                                        maxX = Math.max(maxX, x + w);
                                        maxY = Math.max(maxY, y + h);
                                      }
                                    });
                                    
                                    const boundingWidth = Math.max(maxX - minX, 20);
                                    const boundingHeight = Math.max(maxY - minY, 20);
                                    const scale = Math.min(50 / boundingWidth, 50 / boundingHeight, 1);
                                    const offsetX = (60 - boundingWidth * scale) / 2;
                                    const offsetY = (60 - boundingHeight * scale) / 2;
                                                                        
                                    return elements.map((el, idx) => {
                                      const scaledX = (el.x - minX) * scale + offsetX;
                                      const scaledY = (el.y - minY) * scale + offsetY;
                                      const scaledWidth = (el.width || 20) * scale;
                                      const scaledHeight = (el.height || 20) * scale;
                                      
                                      const hasValidBorder = el.borderWidth && el.borderWidth > 0;
                                      const borderColor = hasValidBorder ? (el.borderColor || '#000000') : 'transparent';
                                      // Make border more visible by ensuring contrast
                                      const effectiveBorderColor = hasValidBorder ? 
                                        (borderColor === 'transparent' || borderColor === el.color ? '#000000' : borderColor) : 'transparent';
                                      
                                      const props = {
                                        key: `thumb-${idx}`,
                                        x: scaledX,
                                        y: scaledY,
                                        fill: el.color || '#9ca3af',
                                        stroke: effectiveBorderColor,
                                        strokeWidth: hasValidBorder ? Math.max(el.borderWidth * scale, 1.5) : 0,
                                        listening: false
                                      };
                                                                            
                                      // Render all shape types properly
                                      if (el.type === 'round') {
                                        return <Circle {...props} radius={scaledWidth / 2} />;
                                      } else if (el.type === 'ellipse') {
                                        return <Ellipse {...props} radiusX={scaledWidth / 2} radiusY={scaledHeight / 2} />;
                                      } else if (el.type === 'triangle') {
                                        return <RegularPolygon {...props} sides={3} radius={scaledWidth / 2} />;
                                      } else if (el.type === 'pentagon') {
                                        return <RegularPolygon {...props} sides={5} radius={scaledWidth / 2} />;
                                      } else if (el.type === 'hexagon') {
                                        return <RegularPolygon {...props} sides={6} radius={scaledWidth / 2} />;
                                      } else if (el.type === 'octagon') {
                                        return <RegularPolygon {...props} sides={8} radius={scaledWidth / 2} />;
                                      } else if (el.type === 'star') {
                                        return <Star {...props} numPoints={5} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} />;
                                      } else if (el.type === 'arc') {
                                        return <Arc {...props} innerRadius={scaledWidth / 4} outerRadius={scaledWidth / 2} angle={180} />;
                                      } else if (el.type === 'line') {
                                        return <Line {...props} points={[0, 0, scaledWidth, 0]} stroke={el.color || '#000000'} strokeWidth={Math.max((el.height || 2) * scale, 1)} fill={undefined} />;
                                      } else if (el.type === 'text') {
                                        return <Text {...props} text={(el.text || 'Text').substring(0, 8)} fontSize={Math.max((el.fontSize || 16) * scale, 8)} width={scaledWidth} height={scaledHeight} />;
                                      } else {
                                        // Default rectangle for square, rectangle, and unknown types
                                        return <Rect {...props} width={scaledWidth} height={scaledHeight} />;
                                      }
                                    });
                                  }
                                })()
                              ) : (
                                // Fallback placeholder
                                <Text x={30} y={30} text="?" fontSize={16} fill="#9ca3af" align="center" />
                              )}
                            </Layer>
                          </Stage>
                        </div>
                        <div 
                          style={{
                            ...styles.elementPlaceholder,
                            display: (element.thumbnail || (element.element_data && element.element_data.elements)) ? 'none' : 'flex'
                          }}
                        >
                          {element.element_data && element.element_data.type === 'group' ? '📦' : '🔷'}
                        </div>
                        <div style={styles.elementInfo}>
                          <span style={styles.elementName}>{element.name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(element.element_id);
                          }}
                          style={{
                            ...styles.deleteElementButton,
                            opacity: 1 // Always show for now, CSS hover not working in React inline styles
                          }}
                          title="Delete custom element"
                        >
                          ×
                        </button>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    No custom elements yet. Select any element(s) and click the save button to create your first custom element!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Saved Layouts Section */}
          <div style={styles.sidebarSection}>
            <div style={styles.sectionHeader}>
              <h3 style={{ margin: 0 }}>Saved Layouts</h3>
              <button
                onClick={newLayout}
                style={styles.newLayoutButton}
                title="Create new layout"
              >
                +
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
                      style={{
                            ...styles.deleteElementButton,
                            opacity: 1 // Always show for now, CSS hover not working in React inline styles
                          }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayout(layout.id, layout.title);
                      }}
                      title="Delete layout"
                    >
                      ×
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

        {/* Canvas Container */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'visible', padding: '1rem' }}>
          {/* Canvas */}
          <div 
            className="layout-canvas" 
            data-prevent-deselect="true"
            style={{
              ...styles.canvas,
              width: STAGE_WIDTH * CANVAS_SCALE,
              height: STAGE_HEIGHT * CANVAS_SCALE,
              maxWidth: '800px',
              padding: 0,
              marginTop: '-16px',
              
            }}
          >
          <Stage
            ref={stageRef}
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            scaleX={CANVAS_SCALE}
            scaleY={CANVAS_SCALE}
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
              {/* Grid background - Dynamic based on page size */}
              {(() => {
                const verticalLines = Math.ceil(STAGE_WIDTH / GRID_SIZE_X) + 1;
                const horizontalLines = Math.ceil(STAGE_HEIGHT / GRID_SIZE_Y) + 1;
                
                return (
                  <>
                    {/* Vertical grid lines */}
                    {Array.from({ length: verticalLines }, (_, i) => (
                      <Rect
                        key={`grid-vertical-${i}`}
                        name="grid-element"
                        x={i * GRID_SIZE_X}
                        y={0}
                        width={1}
                        height={STAGE_HEIGHT}
                        fill="#f0f0f0"
                        listening={false}
                      />
                    ))}
                    {/* Horizontal grid lines */}
                    {Array.from({ length: horizontalLines }, (_, i) => (
                      <Rect
                        key={`grid-horizontal-${i}`}
                        name="grid-element"
                        x={0}
                        y={i * GRID_SIZE_Y}
                        width={STAGE_WIDTH}
                        height={1}
                        fill="#f0f0f0"
                        listening={false}
                      />
                    ))}
                  </>
                );
              })()}
              
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
                    onDragMove={(e) => {
                      // Real-time movement of temp group bounds and elements
                      const deltaX = e.target.x() - tempGroupBounds.x;
                      const deltaY = e.target.y() - tempGroupBounds.y;
                      
                      // Update all selected elements in real-time
                      setLayoutElements(prev => 
                        prev.map(element => 
                          selectedIds.includes(element.id)
                            ? { ...element, x: element.x + deltaX, y: element.y + deltaY }
                            : element
                        )
                      );
                      
                      // Update temp group bounds position in real-time
                      setTempGroupBounds(prev => ({
                        ...prev,
                        x: e.target.x(),
                        y: e.target.y()
                      }));
                      
                      // Show snap guides for group movement if snap-to-grid is enabled
                      if (snapToGrid) {
                        const currentX = e.target.x();
                        const currentY = e.target.y();
                        const nearestGridPos = findNearestGridPosition(currentX, currentY);
                        
                        // Show guides if close enough to snap
                        if (shouldSnapToPosition(currentX, currentY, nearestGridPos.x, nearestGridPos.y)) {
                          setShowSnapGuides([
                            { x: nearestGridPos.x, y: 0, width: 1, height: 600 }, // Vertical guide
                            { x: 0, y: nearestGridPos.y, width: 800, height: 1 }   // Horizontal guide
                          ]);
                        } else {
                          setShowSnapGuides([]);
                        }
                      }
                      
                      // Keep the rect at its original position to avoid double movement
                      e.target.x(tempGroupBounds.x);
                      e.target.y(tempGroupBounds.y);
                    }}
                    onDragEnd={(e) => {
                      // Handle temp group drag - move all selected elements with snap-to-grid
                      const draggedX = e.target.x();
                      const draggedY = e.target.y();
                      
                      // Apply snap-to-grid for group movement
                      const snappedPosition = findNearestGridPosition(draggedX, draggedY);
                      const actualDeltaX = snappedPosition.x - tempGroupBounds.x;
                      const actualDeltaY = snappedPosition.y - tempGroupBounds.y;
                      
                      // Update all selected elements with snapped positions
                      setLayoutElements(prev => 
                        prev.map(element => 
                          selectedIds.includes(element.id)
                            ? { 
                                ...element, 
                                x: element.x + actualDeltaX, 
                                y: element.y + actualDeltaY 
                              }
                            : element
                        )
                      );
                      
                      // Update temp group bounds to snapped position
                      setTempGroupBounds(prev => ({
                        ...prev,
                        x: snappedPosition.x,
                        y: snappedPosition.y
                      }));
                      
                      // Clear snap guides after drag ends
                      setShowSnapGuides([]);
                      
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
              
              {/* Snap-to-grid visual guides */}
              {snapToGrid && showSnapGuides.map((guide, index) => (
                <Rect
                  key={`snap-guide-${index}`}
                  x={guide.x}
                  y={guide.y}
                  width={guide.width}
                  height={guide.height}
                  fill="#22c55e"
                  opacity={0.5}
                  listening={false}
                  name="snap-guide"
                />
              ))}
              
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
                shouldOverdrawWholeArea={false}
                ignoreStroke={true}
                keepRatio={false}
                centeredScaling={false}
                rotateEnabled={false}
                enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
              />
            </Layer>
          </Stage>
          </div>
        </div>

      {/* Text Editing Modal */}
      {editingTextId && (
        <div data-prevent-deselect="true" style={styles.textEditModal}>
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
        <div data-prevent-deselect="true" style={styles.colorPickerModal}>
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
        <div data-prevent-deselect="true" style={styles.borderControlsModal}>
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

      {/* Element Duplication Modal */}
      {showDuplicationModal && (
        <div data-prevent-deselect="true" style={{...styles.modal, zIndex: 9999}}>
          <div style={{...styles.modalContent, minWidth: '400px', maxWidth: '500px'}}>
            <h3 style={{margin: '0 0 20px 0', textAlign: 'center', color: '#1f2937'}}>
              Duplicate Elements with Numbering
            </h3>
            
            <div style={{marginBottom: '20px'}}>
              {/* Configuration */}
              <div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px'}}>
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      Start:
                    </label>
                    <input 
                      type="number"
                      value={duplicationConfig.startValue}
                      onChange={(e) => updateDuplicationConfig({startValue: e.target.value})}
                      style={styles.input}
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      End:
                    </label>
                    <input 
                      type="number"
                      value={duplicationConfig.endValue}
                      onChange={(e) => updateDuplicationConfig({endValue: e.target.value})}
                      style={styles.input}
                      placeholder="10"
                      min="1"
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      Increment:
                    </label>
                    <input 
                      type="number"
                      value={duplicationConfig.increment}
                      onChange={(e) => updateDuplicationConfig({increment: parseInt(e.target.value) || 1})}
                      style={styles.input}
                      min="1"
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      Count:
                    </label>
                    <input 
                      type="number"
                      value={duplicationConfig.duplicateCount}
                      onChange={(e) => updateDuplicationConfig({duplicateCount: parseInt(e.target.value) || 1})}
                      style={styles.input}
                      min="1"
                      max="9999"
                    />
                  </div>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      Direction:
                    </label>
                    <select 
                      value={duplicationConfig.direction}
                      onChange={(e) => updateDuplicationConfig({direction: e.target.value})}
                      style={styles.input}
                    >
                      <option value="right">Left → Right</option>
                      <option value="left">Right → Left</option>
                      <option value="down">Top → Bottom</option>
                      <option value="up">Bottom → Top</option>
                    </select>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: '600'}}>
                      Gap (pixels):
                    </label>
                    <input 
                      type="number"
                      value={duplicationConfig.gap}
                      onChange={(e) => updateDuplicationConfig({gap: parseInt(e.target.value) || 0})}
                      style={styles.input}
                      min="0"
                      max="200"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div style={styles.formActions}>
              <button 
                type="button"
                onClick={cancelDuplication}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={applyDuplication}
                style={{...styles.saveButton, backgroundColor: '#10b981'}}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Element Dialog */}
      {showSaveElementDialog && (
        <div data-prevent-deselect="true" style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{textAlign: 'center', marginBottom: '1rem'}}>Save Custom Element</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const name = formData.get('name');
              const success = await addCustomElementFromSelection(name);
              if (success) {
                setShowSaveElementDialog(false);
                setSelectedIds([]);
                setSelectedId(null);
              }
            }}>
              <div style={styles.formGroup}>
                <label>Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  style={styles.input}
                  placeholder="Enter element name..."
                />
              </div>

              <div style={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowSaveElementDialog(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={styles.saveButton}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div data-prevent-deselect="true" style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Delete Custom Element</h3>
            <p>Are you sure you want to delete this custom element? This action cannot be undone.</p>
            <div style={styles.formActions}>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await deleteCustomElement(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
    backgroundColor: '#ffffffff',
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
    height: '28px',
    boxSizing: 'border-box',
  },
  unsavedIndicator: {
    color: '#f59e0b',
    fontSize: '1.5rem',
    marginLeft: '0.5rem',
    fontWeight: 'bold',
  },
  content: {
    display: 'flex',
    minHeight: 'calc(100vh - 120px)', 
    overflow: 'visible',
  },
  sidebar: {
    width: '300px',
    backgroundColor: '#ffffffff',
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
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    padding: '0.5rem',
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
    position: 'relative',
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
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '1rem',
    marginLeft: 'auto',
    marginRight: 'auto',
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
  
  // Custom Elements Styles
  saveElementButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '600',
  },
  selectionInfo: {
    fontSize: '12px',
    color: '#4f46e5',
    fontWeight: '600',
    padding: '6px 8px',
    backgroundColor: '#ede9fe',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  helperText: {
    fontSize: '10px',
    color: '#9ca3af',
    fontStyle: 'italic',
    display: 'flex',
    alignItems: 'center',
    maxWidth: '150px',
    lineHeight: '1.2',
  },
  instructionBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '4px',
    padding: '8px',
    marginBottom: '12px',
    fontSize: '11px',
    lineHeight: '1.4',
    color: '#0369a1',
  },
  selectionStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
  },
  noSelection: {
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
  },
  singleSelection: {
    color: '#0ea5e9',
    backgroundColor: '#f0f9ff',
  },
  multiSelection: {
    color: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  debugInfo: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '4px',
    padding: '4px 6px',
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#92400e',
    wordBreak: 'break-all',
  },
  toggleButton: {
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 8px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  searchInput: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
  },

  customElementGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '250px',
    overflowY: 'auto',
  },
  customElementItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    position: 'relative',
    ':hover': {
      backgroundColor: '#f9fafb',
      borderColor: '#d1d5db',
    },
    ':hover .delete-button': {
      opacity: 1,
    },
  },
  elementThumbnail: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
  },
  elementPlaceholder: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    fontSize: '20px',
  },
  elementInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  elementName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1f2937',
  },
  elementMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  elementCount: {
    fontSize: '10px',
    color: '#6b7280',
  },


  deleteElementButton: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    fontSize: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  loadingContainer: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '12px',
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  
  // Modal and Dialog Styles
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  formGroup: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginTop: '4px',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginTop: '4px',
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px',
  },
  saveButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#ef4444',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default LayoutDesigner;