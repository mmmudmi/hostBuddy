import React, { act, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEventById, deleteEvent, clearCurrentEvent } from '../store/eventSlice';
import LoadingSpinner from '../components/LoadingSpinner';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentEvent, isLoading, error } = useSelector((state) => state.events);

  useEffect(() => {
    if (id) {
      const numericId = parseInt(id);
      if (!isNaN(numericId) && numericId > 0) {
        dispatch(fetchEventById(numericId));
      } else {
        // Invalid ID, navigate back to dashboard
        navigate('/dashboard');
      }
    }
    
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, id, navigate]);

  const handleDeleteEvent = async () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      const result = await dispatch(deleteEvent(parseInt(id)));
      if (deleteEvent.fulfilled.match(result)) {
        navigate('/dashboard');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    console.log('Formatting dates for event:', event);
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

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  const hasUpcomingDates = () => {
    if (!currentEvent.start_date) return false;
    
    // Check if start date is in the future
    const startDateTime = new Date(`${currentEvent.start_date}T${currentEvent.start_time || '00:00'}`);
    return startDateTime > new Date();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div className="container">
          <div style={styles.errorContainer}>
            <h2>Event Not Found</h2>
            <p>{error}</p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div style={styles.container}>
        <div className="container">
          <div style={styles.errorContainer}>
            <h2>Event Not Found</h2>
            <p>The event you're looking for doesn't exist or has been deleted.</p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div className="container">
        {/* Header */}
        <div style={styles.header}>
          <Link to="/dashboard" className="backLink">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Event Details */}
        <div style={styles.eventContainer}>
          <div style={styles.statusBadge}>
            {hasUpcomingDates() ? (
              <span style={styles.upcomingBadge}>Upcoming</span>
            ) : (
              <span style={styles.pastBadge}>Past Event</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '3rem' }}>
            {/* Event Image */}
            <div>
              {currentEvent.images && currentEvent.images.length > 0 ? (
                <img 
                  src={currentEvent.images[0]} 
                  alt={currentEvent.title}
                  style={styles.eventImage}
                />
              ) : (
                <div style={styles.placeholderImage}>
                  <span style={styles.placeholderText}>No Image</span>
                </div>
              )}
            </div>

            {/* Event Info */}
            <div>
              <div style={styles.eventHeader}>
                <h1 style={styles.eventTitle}>{currentEvent.title}</h1>
              </div>

              <div style={styles.eventMeta}>
                <div style={styles.description}>
                  <p style={styles.descriptionText}>{currentEvent.description}</p>
                </div>

                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>📅</span>
                  <div>
                    <div style={styles.metaLabel}>Event Date</div>
                    <div style={styles.metaValue}>
                      <div style={styles.eventDateItem}>
                        {formatEventDates(currentEvent)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>⏰</span>
                  <div>
                    <div style={styles.metaLabel}>Event Time</div>
                    <div style={styles.metaValue}>
                      <div style={styles.eventDateItem}>
                        {formatTime(currentEvent)}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>📍</span>
                  <div>
                    <div style={styles.metaLabel}>Location</div>
                    <div style={styles.metaValue}>{currentEvent.location}</div>
                  </div>
                </div>
              </div>


              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                <Link 
                  to={`/events/${id}/layout`}
                  className="btn btn-primary"
                  style={styles.actionButton}
                >
                  <i class="fa-solid fa-pen-ruler" style={{ marginRight: '0.5rem' }}></i>
                  Design Layout
                </Link>
                <Link 
                  to={`/events/${id}/edit`}
                  className="btn btn-cancel"
                  style={styles.actionButton}
                >
                  <i class="fa-solid fa-pen-to-square" style={{ marginRight: '0.5rem' }}></i>
                  Edit
                </Link>
                <button 
                  onClick={handleDeleteEvent}
                  className="btn btn-danger"
                  style={styles.actionButton}
                >
                  <i class="fa-solid fa-trash" style={{ marginRight: '0.5rem' }}></i>
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Additional Information
          <div style={styles.additionalInfo}>
            <h3 style={styles.sectionTitle}>Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
              <div style={styles.infoCard}>
                <h4>Created</h4>
                <p>{new Date(currentEvent.created_at).toLocaleDateString()}</p>
              </div>
              <div style={styles.infoCard}>
                <h4>Last Updated</h4>
                <p>{new Date(currentEvent.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div> */}

        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem 0',
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f9fafb',
  },
  header: {
    marginBottom: '2rem',
  },
  eventContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  eventImage: {
    width: '100%',
    height: '400px',
    objectFit: 'scale-down',
    borderRadius: '12px',
  },
  placeholderImage: {
    width: '100%',
    height: '400px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: '1.25rem',
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  eventTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
    flex: 1,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  statusBadge: {
    marginBottom: '1rem',
    marginTop: '-1rem',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  upcomingBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  pastBadge: {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  eventMeta: {
    marginBottom: '2rem',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  metaIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem',
    marginTop: '0.25rem',
  },
  metaLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: '1rem',
    color: '#1f2937',
    fontWeight: '500',
    marginTop: '0.25rem',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  description: {
    marginBottom: '2rem',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  descriptionText: {
    color: '#4b5563',
    lineHeight: '1.7',
    fontSize: '1rem',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    margin: '3rem 0 1rem 0',
  },
  actionButton: {
    fontWeight: '600',
  },
  additionalInfo: {
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid #e5e7eb',
  },
  infoCard: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  eventDateItem: {
    marginBottom: '0.5rem',
  },
  upcomingLabel: {
    color: '#059669',
    fontWeight: '600',
    fontSize: '0.875rem',
  },
};

export default EventDetails;