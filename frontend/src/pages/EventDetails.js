import React, { useEffect } from 'react';
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

  const formatEventDate = (event) => {
    if (!event.start_date) return 'No date set';
    
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const endDateStr = endDate && endDate.getTime() !== startDate.getTime() 
      ? endDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;
    
    const timeStr = event.start_time && event.end_time 
      ? `${event.start_time} - ${event.end_time}`
      : '';
    
    if (endDateStr) {
      return `${dateStr} to ${endDateStr}${timeStr ? `, ${timeStr}` : ''}`;
    } else {
      return `${dateStr}${timeStr ? `, ${timeStr}` : ''}`;
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
          <Link to="/dashboard" style={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Event Details */}
        <div style={styles.eventContainer}>
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
                <div style={styles.statusBadge}>
                  {hasUpcomingDates() ? (
                    <span style={styles.upcomingBadge}>Upcoming</span>
                  ) : (
                    <span style={styles.pastBadge}>Past Event</span>
                  )}
                </div>
              </div>

              <div style={styles.eventMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaIcon}>📅</span>
                  <div>
                    <div style={styles.metaLabel}>Event Date & Time</div>
                    <div style={styles.metaValue}>
                      <div style={styles.eventDateItem}>
                        {formatEventDate(currentEvent)}
                        {hasUpcomingDates() && (
                          <span style={styles.upcomingLabel}> (Upcoming)</span>
                        )}
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

              <div style={styles.description}>
                <h3 style={styles.sectionTitle}>Description</h3>
                <p style={styles.descriptionText}>{currentEvent.description}</p>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                <Link 
                  to={`/events/${id}/layout`}
                  className="btn btn-primary"
                  style={styles.designButton}
                >
                  🎨 Design Layout
                </Link>
                <Link 
                  to={`/events/${id}/edit`}
                  className="btn btn-secondary"
                >
                  ✏️ Edit Event
                </Link>
                <button 
                  onClick={handleDeleteEvent}
                  className="btn btn-danger"
                >
                  🗑️ Delete Event
                </button>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div style={styles.additionalInfo}>
            <h3 style={styles.sectionTitle}>Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
              <div style={styles.infoCard}>
                <h4>Event ID</h4>
                <p>{currentEvent.event_id}</p>
              </div>
              <div style={styles.infoCard}>
                <h4>Created</h4>
                <p>{new Date(currentEvent.created_at).toLocaleDateString()}</p>
              </div>
              <div style={styles.infoCard}>
                <h4>Last Updated</h4>
                <p>{new Date(currentEvent.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
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
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
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
    objectFit: 'cover',
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
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
    flex: 1,
  },
  statusBadge: {
    marginLeft: '1rem',
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
    fontSize: '1.1rem',
    color: '#1f2937',
    fontWeight: '600',
    marginTop: '0.25rem',
  },
  description: {
    marginBottom: '2rem',
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
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  designButton: {
    fontSize: '1rem',
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
    padding: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  upcomingLabel: {
    color: '#059669',
    fontWeight: '600',
    fontSize: '0.875rem',
  },
};

export default EventDetails;