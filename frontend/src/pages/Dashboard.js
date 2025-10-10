import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, deleteEvent } from '../store/eventSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomizedModal from '../components/CustomizedModal';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, isLoading, error } = useSelector((state) => state.events);
  const { user } = useSelector((state) => state.auth);
  const [deletingEventId, setDeletingEventId] = React.useState(null);
  const [errorModal, setErrorModal] = React.useState({ show: false, message: '' });
  const [confirmModal, setConfirmModal] = React.useState({ show: false, message: '', action: null });

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const handleDeleteEvent = async (eventId) => {
    // Debug: Log the event ID to understand what we're working with
    console.log('Attempting to delete event with ID:', eventId, 'Type:', typeof eventId);
    
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to delete this event?',
      action: () => {
        setConfirmModal({ show: false, message: '', action: null });
        performDeleteEvent(eventId);
      }
    });
  };

  const performDeleteEvent = async (eventId) => {
    try {
      setDeletingEventId(eventId);
      await dispatch(deleteEvent(eventId)).unwrap();
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
      
      setErrorModal({ show: true, message: errorMessage });
    } finally {
      setDeletingEventId(null);
    }
  };

  const formatTime = (event) => {
    if (!event.start_time) return 'No time set';
    const startTime = new Date(`1970-01-01T${event.start_time}`);
    const endTime = event.end_time ? new Date(`1970-01-01T${event.end_time}`) : null;
    if (endTime && endTime.getTime() !== startTime.getTime()) {
      return `${startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${endTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    return startTime.toLocaleTimeString('en-US', {
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
      return `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
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
    <div className="dashboard background">
      <div className="container">

        {error && (
          <div style={styles.errorMessage}>
            {error}
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

        <div style={styles.eventsContainer}>
          <div style={styles.eventsHeader}>
            <h3 style={{marginBottom: '1rem'}}>Your Events</h3>
            <Link to="/create-event" className="btn" style={styles.circleBtn}>
              <i class="fa-solid fa-plus"></i>
            </Link>
          </div>
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
                <div 
                  key={event.event_id} 
                  className="event-card"
                  onClick={() => navigate(`/events/${event.event_id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {event.images && event.images.length > 0 ? (
                    <img 
                      src={event.images[0]} 
                      alt={event.title}
                      className="event-image"
                    />
                  ) : (
                    <div 
                      className="event-image-placeholder"
                      style={styles.imagePlaceholder}
                    >
                    </div>
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
                      <div key="location" style={{paddingBottom: '0.5rem'}}>📍 {event.location}</div>
                      <div key="date" style={{paddingBottom: '0.5rem'}}>📅 {formatEventDates(event)}</div>
                      <div key="time" style={{paddingBottom: '0.5rem'}}>⏰ {formatTime(event)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      {errorModal.show && (
        <CustomizedModal 
          onClose={() => setErrorModal({ show: false, message: '' })}
          confirmMessage={errorModal.message}
          confirmButtonText="OK"
          allowCancel={false}
          type="alert"
        />
      )}
      {confirmModal.show && (
        <CustomizedModal 
          onClose={() => setConfirmModal({ show: false, message: '', action: null })}
          onConfirm={confirmModal.action}
          confirmMessage={confirmModal.message}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          allowCancel={true}
          type="confirm"
        />
      )}
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
    margin: '2rem',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  eventsContainer: {
    margin: '2rem',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  eventsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  circleBtn: {
    margin: '-2rem -1rem 0 0',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#000000ff',
    backgroundColor: '#ffffffff',
    border: 'none',
    textDecoration: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
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
    color: '#000000ff',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  imagePlaceholder: {
    width: '100%',
    height: '200px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Hexagonal pattern background
    '--s': '82px',
    '--c1': '#f9f9f9ff',
    '--c2': '#ffffff',
    '--c3': '#f5f5f5ff',
    '--_g': 'var(--c3) 0 120deg, transparent 0',
    background: `
      conic-gradient(from -60deg at 50% calc(100%/3), var(--_g)),
      conic-gradient(from 120deg at 50% calc(200%/3), var(--_g)),
      conic-gradient(from 60deg at calc(200%/3), var(--c3) 60deg, var(--c2) 0 120deg, transparent 0),
      conic-gradient(from 180deg at calc(100%/3), var(--c1) 60deg, var(--_g)),
      linear-gradient(90deg, var(--c1) calc(100%/6), var(--c2) 0 50%, var(--c1) 0 calc(500%/6), var(--c2) 0)
    `,
    backgroundSize: 'calc(1.732 * var(--s)) var(--s)',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    overflow: 'hidden',
  },
};

export default Dashboard;