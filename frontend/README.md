# Host Buddy Frontend

A React-based frontend for the Host Buddy event management platform. This application provides a complete event management solution with features for creating, managing, and designing layouts for events.

## Features

- **Landing Page**: Hero section with call-to-action and feature highlights
- **Authentication**: User registration and login with JWT tokens
- **Dashboard**: Event overview with creation, editing, and deletion capabilities
- **Event Management**: Complete CRUD operations for events
- **Layout Designer**: Drag-and-drop canvas for creating event layouts
- **Image Upload**: S3 integration for event images
- **Export Functionality**: Export layouts as PNG or PDF

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DraggableItem.js
│   │   │   ├── DropZone.js
│   │   │   ├── LayoutElement.js
│   │   │   └── LayoutSidebar.js
│   │   ├── Footer.js
│   │   ├── LoadingSpinner.js
│   │   └── Navbar.js
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.js
│   │   │   └── SignupPage.js
│   │   ├── CreateEvent.js
│   │   ├── Dashboard.js
│   │   ├── EventDetails.js
│   │   ├── LandingPage.js
│   │   └── LayoutDesigner.js
│   ├── router/
│   │   ├── PrivateRoute.js
│   │   └── PublicRoute.js
│   ├── store/
│   │   ├── authSlice.js
│   │   ├── eventSlice.js
│   │   └── store.js
│   ├── utils/
│   │   └── api/
│   │       ├── apiClient.js
│   │       ├── authAPI.js
│   │       ├── eventAPI.js
│   │       ├── layoutAPI.js
│   │       └── uploadAPI.js
│   ├── App.css
│   ├── App.js
│   ├── index.css
│   └── index.js
├── package.json
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- FastAPI backend running (see backend documentation)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.development .env.local
```

4. Update environment variables in `.env.local`:
```env
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_UPLOAD_URL=http://localhost:8000/api/v1/upload
```

### Running the Application

1. Start the development server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

### Building for Production

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `build/` directory.

## API Integration

The frontend integrates with the FastAPI backend through the following endpoints:

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user

### Events
- `GET /api/v1/events` - Get all events
- `POST /api/v1/events` - Create new event
- `GET /api/v1/events/{id}` - Get event by ID
- `PUT /api/v1/events/{id}` - Update event
- `DELETE /api/v1/events/{id}` - Delete event

### Layouts
- `GET /api/v1/layouts` - Get layouts for event
- `POST /api/v1/layouts` - Create new layout
- `GET /api/v1/layouts/{id}` - Get layout by ID
- `PUT /api/v1/layouts/{id}` - Update layout
- `DELETE /api/v1/layouts/{id}` - Delete layout

### Upload
- `POST /api/v1/upload/image` - Upload event images

## Components Overview

### Core Pages

- **LandingPage**: Marketing page with hero section and features
- **LoginPage/SignupPage**: Authentication forms
- **Dashboard**: Event management overview
- **CreateEvent**: Event creation and editing form
- **EventDetails**: Detailed event view
- **LayoutDesigner**: Drag-and-drop layout creation

### Layout Designer Features

- **Drag & Drop**: Intuitive element placement
- **Element Library**: Tables, chairs, stage, bar, etc.
- **Properties Panel**: Resize and configure elements
- **Save/Load**: Persistent layout storage
- **Export**: PNG and PDF export functionality

### State Management

The application uses Redux Toolkit for state management:

- **authSlice**: User authentication and profile
- **eventSlice**: Event data and operations

### Styling

- CSS-in-JS for component styling
- Responsive design with mobile support
- Consistent design system with reusable classes

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App

### Code Structure Guidelines

- Components are organized by feature
- API calls are centralized in `utils/api/`
- Redux slices handle state management
- Reusable styles in `index.css`

### Adding New Features

1. Create components in appropriate directories
2. Add API endpoints in `utils/api/`
3. Update Redux slices if needed
4. Add routes in `App.js`
5. Update styling in CSS files

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code structure
2. Use consistent naming conventions
3. Add appropriate error handling
4. Test thoroughly before submitting

## Troubleshooting

### Common Issues

1. **API Connection Issues**:
   - Check that backend is running
   - Verify API URLs in environment variables

2. **Authentication Problems**:
   - Clear browser localStorage
   - Check token expiration

3. **Image Upload Failures**:
   - Verify S3 configuration in backend
   - Check file size limits

4. **Layout Designer Issues**:
   - Ensure react-dnd dependencies are installed
   - Check browser drag/drop support

### Performance Optimization

- Images are lazy-loaded where possible
- Redux state is normalized
- Components use React.memo for optimization
- Bundle size is optimized with tree shaking

For additional help, refer to the FastAPI backend documentation or contact the development team.