# Host Buddy Backend

A FastAPI backend for the Host Buddy event management platform with PostgreSQL integration.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Event Management**: CRUD operations for events with image upload support
- **Layout Management**: Save and export event layouts with JSONB storage
- **PostgreSQL Integration**: Full database integration with migrations
- **Docker Support**: Containerized application with Docker Compose

## Tech Stack

- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database
- **Alembic**: Database migrations
- **JWT**: Authentication tokens
- **Pydantic**: Data validation and serialization
- **Docker**: Containerization

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Authentication endpoints
│   │       ├── events.py        # Event management endpoints
│   │       ├── layouts.py       # Layout management endpoints
│   │       └── api.py           # API router configuration
│   ├── core/
│   │   ├── config.py           # Configuration settings
│   │   ├── database.py         # Database connection
│   │   └── auth.py             # Authentication utilities
│   ├── models/
│   │   └── models.py           # SQLAlchemy models
│   ├── schemas/
│   │   ├── user.py             # User Pydantic models
│   │   ├── event.py            # Event Pydantic models
│   │   └── layout.py           # Layout Pydantic models
│   └── main.py                 # FastAPI application
├── alembic/                    # Database migrations
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
├── docker-compose.yml         # Docker Compose setup
└── .env.example               # Environment variables example
```

## Database Schema

### Users Table
- `user_id` (Primary Key)
- `name`
- `email` (Unique)
- `password_hash`
- `created_at`

### Events Table
- `event_id` (Primary Key)
- `user_id` (Foreign Key)
- `title`
- `description`
- `date`
- `location`
- `images[]` (Array of image URLs)
- `created_at`
- `updated_at`

### Layouts Table
- `layout_id` (Primary Key)
- `event_id` (Foreign Key)
- `name`
- `layout` (JSONB)
- `created_at`
- `updated_at`

## Quick Start

### Using Docker (Recommended)

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the application:
   ```bash
   docker-compose up -d
   ```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Database Admin**: http://localhost:8080 (Adminer)

### Manual Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up PostgreSQL database

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Run migrations:
   ```bash
   alembic upgrade head
   ```

5. Start the application:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user profile

### Events
- `POST /api/v1/events/` - Create event
- `GET /api/v1/events/` - Get user events
- `GET /api/v1/events/{event_id}` - Get specific event
- `PUT /api/v1/events/{event_id}` - Update event
- `DELETE /api/v1/events/{event_id}` - Delete event
- `POST /api/v1/events/{event_id}/images` - Add image to event
- `DELETE /api/v1/events/{event_id}/images/{image_index}` - Remove image

### Layouts
- `POST /api/v1/layouts/` - Create layout
- `GET /api/v1/layouts/event/{event_id}` - Get event layouts
- `GET /api/v1/layouts/{layout_id}` - Get specific layout
- `PUT /api/v1/layouts/{layout_id}` - Update layout
- `DELETE /api/v1/layouts/{layout_id}` - Delete layout
- `GET /api/v1/layouts/{layout_id}/export` - Export layout
- `GET /api/v1/layouts/` - Get user layouts

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@localhost:5432/hostbuddy` |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | `your-secret-key-here` |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `30` |

## Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply migrations:
```bash
alembic upgrade head
```

## Development

1. Install development dependencies
2. Set up pre-commit hooks
3. Run tests:
   ```bash
   pytest
   ```

## Production Deployment

1. Update environment variables for production
2. Use a production-grade ASGI server
3. Set up proper SSL/TLS
4. Configure database connection pooling
5. Set up monitoring and logging

## Security Considerations

- Change default JWT secret key
- Use HTTPS in production
- Implement rate limiting
- Validate and sanitize all inputs
- Regular security updates

## License

This project is licensed under the MIT License.