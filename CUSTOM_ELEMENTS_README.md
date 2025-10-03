# Custom Elements Feature

This feature allows users to create, manage, and reuse custom elements in the HostBuddy Layout Designer. Users can save combinations of elements and use them across different layouts.

## Features

### ✅ Implemented

1. **Database Model** - `UserElement` model for storing custom elements
2. **Backend API** - Complete CRUD operations for user elements
3. **Frontend State Management** - React state for managing custom elements
4. **UI Components** - Custom elements panel with search and filtering
5. **Element Creation** - Save selected elements as custom reusable components
6. **Element Management** - Delete and organize custom elements
7. **Thumbnail Generation** - Automatic thumbnail creation for visual previews
8. **Tag System** - Categorize and filter elements by tags
9. **Usage Tracking** - Track how often elements are used

### 🔧 How to Use

#### Creating Custom Elements
1. In the Layout Designer, select multiple elements using Shift+Click or drag selection
2. Click the save button (💾) in the "My Elements" section
3. Fill in the element name, description, and tags
4. Click "Save Element"

#### Using Custom Elements
1. Toggle the "My Elements" panel open using the arrow button
2. Browse your saved elements or use search/filter
3. Click on any custom element to add it to the current layout
4. The element will be placed on the canvas and usage count will increment

#### Managing Custom Elements
1. Hover over any custom element to see the delete button (×)
2. Click delete and confirm to remove the element permanently
3. Use the search box to find specific elements
4. Filter by tags using the dropdown

### 📁 Files Modified/Created

#### Backend
- `app/models/models.py` - Added UserElement model
- `app/schemas/user_element.py` - Pydantic schemas for user elements
- `app/api/v1/user_elements.py` - API endpoints for CRUD operations
- `app/api/v1/api.py` - Router registration

#### Frontend
- `src/pages/LayoutDesigner.js` - Added custom elements functionality
- `src/utils/api/userElementsAPI.js` - API utility functions

### 🔌 API Endpoints

All endpoints require authentication with JWT token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user-elements` | Get all custom elements for user |
| POST | `/user-elements` | Create a new custom element |
| GET | `/user-elements/{id}` | Get specific custom element |
| PUT | `/user-elements/{id}` | Update custom element |
| DELETE | `/user-elements/{id}` | Delete custom element |
| POST | `/user-elements/{id}/use` | Increment usage count |
| POST | `/user-elements/from-selection` | Create element from selection |

### 📊 Database Schema

```sql
CREATE TABLE user_elements (
    element_id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    element_data JSON NOT NULL,
    thumbnail TEXT,
    tags JSON DEFAULT '[]',
    is_public INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔧 Data Structure

Custom elements store their data in JSON format:

```json
{
  "type": "group",
  "elements": [
    {
      "id": "element-1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 120,
      "height": 60,
      "fill": "#9ca3af"
    }
  ],
  "element_count": 1
}
```

### 🎨 UI Components

1. **Custom Elements Panel** - Collapsible sidebar section
2. **Element Grid** - Visual grid of saved elements with thumbnails
3. **Search & Filter** - Text search and tag-based filtering
4. **Save Dialog** - Modal for creating new elements
5. **Delete Confirmation** - Confirmation dialog for deletions

### ⚡ Performance Features

- **Lazy Loading** - Custom elements loaded on demand
- **Thumbnail Caching** - Generated thumbnails stored as base64
- **Local Fallback** - localStorage backup when backend unavailable
- **Efficient Rendering** - Only visible elements rendered in grid

### 🧪 Testing

Run the test script to validate the implementation:

```bash
./test_custom_elements.sh
```

For manual testing:
1. Start the backend server
2. Create a user account and login
3. Open Layout Designer
4. Test creating, using, and deleting custom elements

### 🔮 Future Enhancements

- **Element Sharing** - Make elements public/shareable
- **Element Categories** - Organize elements into categories
- **Import/Export** - Backup and restore custom elements
- **Advanced Search** - Search by element properties
- **Element Templates** - Pre-built element collections
- **Collaborative Elements** - Team/organization-wide element libraries

### 🐛 Known Limitations

- Database migration needs to be run manually
- Authentication required for all operations
- Thumbnail generation is client-side only
- No batch operations for multiple elements

### 🔧 Configuration

The feature requires:
- Backend authentication system
- Database with user_elements table
- JWT token validation
- CORS configuration for API calls

This feature significantly enhances the Layout Designer by allowing users to build a personal library of reusable components, making layout creation more efficient and consistent.