import apiClient from './apiClient';

const userElementsAPI = {
  /**
   * Get all custom elements for the current user
   * @param {Object} params - Query parameters
   * @param {string} params.search - Search term for name
   */
  getUserElements: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) {
      queryParams.append('search', params.search);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/user-elements?${queryString}` : '/user-elements';
    
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get a specific custom element by ID
   * @param {number} elementId - The element ID
   */
  getUserElement: async (elementId) => {
    const response = await apiClient.get(`/user-elements/${elementId}`);
    return response.data;
  },

  /**
   * Create a new custom element
   * @param {Object} elementData - The element data
   * @param {string} elementData.name - Element name
   * @param {Object} elementData.element_data - Element configuration
   * @param {string} elementData.thumbnail - Base64 encoded thumbnail
   */
  createUserElement: async (elementData) => {
    const response = await apiClient.post('/user-elements', elementData);
    return response.data;
  },

  /**
   * Create a custom element from selected layout elements
   * @param {Object} elementData - The element data including grouped elements
   */
  createElementFromSelection: async (elementData) => {
    const response = await apiClient.post('/user-elements/from-selection', elementData);
    return response.data;
  },

  /**
   * Update an existing custom element
   * @param {number} elementId - The element ID
   * @param {Object} updateData - Fields to update
   */
  updateUserElement: async (elementId, updateData) => {
    const response = await apiClient.put(`/user-elements/${elementId}`, updateData);
    return response.data;
  },

  /**
   * Delete a custom element
   * @param {number} elementId - The element ID
   */
  deleteUserElement: async (elementId) => {
    const response = await apiClient.delete(`/user-elements/${elementId}`);
    return response.data;
  },

  /**
   * Increment the usage count of a custom element
   * @param {number} elementId - The element ID
   */
  incrementElementUsage: async (elementId) => {
    const response = await apiClient.post(`/user-elements/${elementId}/use`);
    return response.data;
  },

  /**
   * Generate a thumbnail from Konva elements
   * @param {Array} elements - Array of Konva element configurations
   * @param {number} maxWidth - Maximum thumbnail width
   * @param {number} maxHeight - Maximum thumbnail height
   * @returns {string} Base64 encoded thumbnail
   */
  generateThumbnailFromElements: (elements, maxWidth = 80, maxHeight = 80) => {
    if (!elements || elements.length === 0) {
      return null;
    }

    // Calculate bounding box of all elements using visual bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(element => {
      let bounds;
      
      // Calculate visual bounds based on element type
      switch (element.type) {
        case 'round':
        case 'ellipse':
        case 'triangle':
        case 'pentagon':
        case 'hexagon':
        case 'octagon':
        case 'star':
        case 'arc':
          // Centered shapes - x,y is center
          const radiusX = (element.width || 50) / 2;
          const radiusY = (element.height || element.width || 50) / 2;
          bounds = {
            minX: element.x - radiusX,
            minY: element.y - radiusY,
            maxX: element.x + radiusX,
            maxY: element.y + radiusY
          };
          break;
        default:
          // Rectangle-based shapes - x,y is top-left
          bounds = {
            minX: element.x,
            minY: element.y,
            maxX: element.x + (element.width || 50),
            maxY: element.y + (element.height || 50)
          };
      }
      
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;
    
    // Add padding
    const padding = 8;
    const availableWidth = maxWidth - padding * 2;
    const availableHeight = maxHeight - padding * 2;
    
    // Calculate scale to fit within thumbnail dimensions
    const scale = Math.min(availableWidth / boundingWidth, availableHeight / boundingHeight, 1);
    const scaledWidth = boundingWidth * scale;
    const scaledHeight = boundingHeight * scale;
    
    // Center the thumbnail
    const offsetX = (maxWidth - scaledWidth) / 2;
    const offsetY = (maxHeight - scaledHeight) / 2;

    // Create a canvas for the thumbnail
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    const ctx = canvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, maxWidth, maxHeight);
    
    // Add subtle border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, maxWidth - 1, maxHeight - 1);
    
    // Draw simplified version of elements
    elements.forEach(element => {
      ctx.save();
      
      // Calculate scaled and offset position
      const x = (element.x - minX) * scale + offsetX;
      const y = (element.y - minY) * scale + offsetY;
      const width = (element.width || 50) * scale;
      const height = (element.height || element.width || 50) * scale;
      
      ctx.fillStyle = element.fill || element.color || '#9ca3af';
      ctx.strokeStyle = element.stroke || element.borderColor || 'transparent';
      ctx.lineWidth = Math.max((element.strokeWidth || element.borderWidth || 0) * scale, 0.5);
      
      // Draw based on element type
      switch (element.type) {
        case 'round':
          ctx.beginPath();
          ctx.arc(x, y, width/2, 0, 2 * Math.PI);
          ctx.fill();
          if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'transparent') ctx.stroke();
          break;
          
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(x, y, width/2, height/2, 0, 0, 2 * Math.PI);
          ctx.fill();
          if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'transparent') ctx.stroke();
          break;
          
        case 'triangle':
          ctx.beginPath();
          const radius = width / 2;
          ctx.moveTo(x, y - radius);
          ctx.lineTo(x - radius * Math.cos(Math.PI / 6), y + radius * Math.sin(Math.PI / 6));
          ctx.lineTo(x + radius * Math.cos(Math.PI / 6), y + radius * Math.sin(Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'transparent') ctx.stroke();
          break;
          
        case 'star':
          ctx.beginPath();
          const outerRadius = width / 2;
          const innerRadius = outerRadius * 0.5;
          for (let i = 0; i < 10; i++) {
            const angle = (i * 36 - 90) * Math.PI / 180;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const px = x + r * Math.cos(angle);
            const py = y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'transparent') ctx.stroke();
          break;
          
        case 'line':
          ctx.beginPath();
          ctx.moveTo(x - width/2, y);
          ctx.lineTo(x + width/2, y);
          ctx.strokeStyle = element.color || '#000000';
          ctx.lineWidth = Math.max((element.height || 2) * scale, 1);
          ctx.stroke();
          break;
          
        case 'text':
          ctx.fillStyle = element.color || '#000000';
          ctx.font = `${Math.max((element.fontSize || 16) * scale, 8)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((element.text || 'Text').substring(0, 10), x + width/2, y + height/2);
          break;
          
        default:
          // Default to rectangle for unknown types (square, rectangle, etc.)
          ctx.fillRect(x - width/2, y - height/2, width, height);
          if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'transparent') {
            ctx.strokeRect(x - width/2, y - height/2, width, height);
          }
      }
      
      ctx.restore();
    });
    
    // Convert to base64
    return canvas.toDataURL('image/png');
  }
};

export default userElementsAPI;