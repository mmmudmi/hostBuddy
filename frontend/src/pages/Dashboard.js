import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, deleteEvent } from '../store/eventSlice';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, isLoading, error } = useSelector((state) => state.events);
  const { user } = useSelector((state) => state.auth);
  const [deletingEventId, setDeletingEventId] = React.useState(null);

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  // Debug: Log the events structure to understand the field names
  useEffect(() => {
    if (events.length > 0) {
      console.log('Events structure:', events[0]);
      console.log('Available fields:', Object.keys(events[0]));
    }
  }, [events]);

  const handleDeleteEvent = async (eventId) => {
    // Debug: Log the event ID to understand what we're working with
    console.log('Attempting to delete event with ID:', eventId, 'Type:', typeof eventId);
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        setDeletingEventId(eventId);
        await dispatch(deleteEvent(eventId)).unwrap();
        // Show success feedback
        const eventToDelete = events.find(event => event.event_id === eventId);
        alert(`Event "${eventToDelete?.title}" has been successfully deleted.`);
      } catch (error) {
        console.error('Failed to delete event:', error);
        
        // Provide more detailed error information for debugging
        let errorMessage = 'Failed to delete event';
        
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error?.response?.status) {
          errorMessage = `Server error (${error.response.status}): ${error.response.statusText || 'Unknown error'}`;
        } else if (!navigator.onLine) {
          errorMessage = 'No internet connection. Please check your network.';
        } else {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        alert(errorMessage);
      } finally {
        setDeletingEventId(null);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventDates = (event) => {
    if (!event.start_date) return 'No date set';
    
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      return `${startDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} - ${endDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else {
      const timeStr = event.start_time && event.end_time 
        ? ` ${event.start_time}-${event.end_time}`
        : '';
      return `${startDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })}${timeStr}`;
    }
  };

  const hasUpcomingDates = (event) => {
    if (!event.start_date) return false;
    
    // Check if start date is in the future
    const startDateTime = new Date(`${event.start_date}T${event.start_time || '00:00'}`);
    return startDateTime > new Date();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Welcome back, {user?.full_name || 'User'}!
            </h1>
            <p style={styles.subtitle}>
              Manage your events and create amazing experiences
            </p>
          </div>
          <Link to="/create-event" className="btn btn-primary">
            Create New Event
          </Link>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              📅
            </div>
            <h3>No events yet</h3>
            <p>
              Create your first event to get started with Host Buddy
            </p>
            <Link to="/create-event" className="btn btn-primary">
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div key={event.event_id} className="event-card">
                {event.images && event.images.length > 0 && (
                  <img 
                    src={event.images[0]} 
                    alt={event.title}
                    className="event-image"
                  />
                )}
                
                <div className="event-content">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-description">
                    {event.description?.length > 100 
                      ? `${event.description.substring(0, 100)}...`
                      : event.description
                    }
                  </p>
                  
                  <div className="event-meta">
                    <div key="location">📍 {event.location}</div>
                    <div key="date">📅 {formatEventDates(event)}</div>
                  </div>
                  
                  <div className="event-actions">
                    <Link 
                      key="view"
                      to={`/events/${event.event_id}`}
                      className="btn btn-secondary btn-small"
                    >
                      View Details
                    </Link>
                    <Link 
                      key="edit"
                      to={`/events/${event.event_id}/edit`}
                      className="btn btn-secondary btn-small"
                    >
                      Edit
                    </Link>
                    <Link 
                      key="layout"
                                            to={`/events/${event.event_id}/layout`}
                      className="btn btn-primary btn-small"
                    >
                      Design Layout
                    </Link>
                    <button 
                      key="delete"
                      onClick={() => handleDeleteEvent(event.event_id)}
                      className="btn btn-danger btn-small"
                      disabled={deletingEventId === event.event_id}
                    >
                      {deletingEventId === event.event_id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div style={styles.summary}>
            <h3>Quick Stats</h3>
            <div style={styles.statsGrid}>
              <div key="total" style={styles.statCard}>
                <div style={styles.statNumber}>{events.length}</div>
                <div style={styles.statLabel}>Total Events</div>
              </div>
              <div key="upcoming" style={styles.statCard}>
                <div style={styles.statNumber}>
                  {events.filter(event => hasUpcomingDates(event)).length}
                </div>
                <div style={styles.statLabel}>Upcoming Events</div>
              </div>
              <div key="past" style={styles.statCard}>
                <div style={styles.statNumber}>
                  {events.filter(event => !hasUpcomingDates(event)).length}
                </div>
                <div style={styles.statLabel}>Past Events</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    marginTop: '0.5rem',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '14px',
  },
  summary: {
    marginTop: '3rem',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  statCard: {
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
};

export default Dashboard;