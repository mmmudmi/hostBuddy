import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createEvent, updateEvent, fetchEventById, clearCurrentEvent } from '../store/eventSlice';
import uploadAPI from '../utils/api/uploadAPI';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateEvent = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    image_url: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentEvent, isLoading, error } = useSelector((state) => state.events);

  useEffect(() => {
    if (isEditing && id) {
      const numericId = parseInt(id);
      if (!isNaN(numericId) && numericId > 0) {
        dispatch(fetchEventById(numericId));
      } else {
        // Invalid ID for editing, navigate back to dashboard
        navigate('/dashboard');
      }
    } else {
      dispatch(clearCurrentEvent());
    }
    
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, id, isEditing, navigate]);

  useEffect(() => {
    if (isEditing && currentEvent) {
      const existingImageUrl = (currentEvent.images && currentEvent.images.length > 0) ? currentEvent.images[0] : '';
      setFormData({
        title: currentEvent.title || '',
        description: currentEvent.description || '',
        location: currentEvent.location || '',
        start_date: currentEvent.start_date || '',
        end_date: currentEvent.end_date || '',
        start_time: currentEvent.start_time || '',
        end_time: currentEvent.end_time || '',
        image_url: existingImageUrl
      });
      setImagePreview(existingImageUrl);
    }
  }, [isEditing, currentEvent]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear field-specific errors
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: '',
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.image_url;
    
    setIsUploading(true);
    try {
      const response = await uploadAPI.uploadImage(imageFile);
      return response.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Event title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Event description is required';
    }
    
    if (!formData.location.trim()) {
      errors.location = 'Event location is required';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!formData.start_time) {
      errors.start_time = 'Start time is required';
    }
    
    if (!formData.end_time) {
      errors.end_time = 'End time is required';
    }
    
    // Validate date range
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        errors.end_date = 'End date must be after start date';
      }
    }
    
    // Validate time range for same day events
    if (formData.start_time && formData.end_time && 
        (!formData.end_date || formData.start_date === formData.end_date)) {
      if (formData.end_time <= formData.start_time) {
        errors.end_time = 'End time must be after start time';
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      let imageUrl = formData.image_url;
      
      // Upload new image if one was selected
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        images: imageUrl ? [imageUrl] : [],
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null
      };
      
      let result;
      if (isEditing) {
        result = await dispatch(updateEvent({ id: parseInt(id), eventData }));
      } else {
        result = await dispatch(createEvent(eventData));
      }
      
      if (createEvent.fulfilled.match(result) || updateEvent.fulfilled.match(result)) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  if (isLoading && isEditing) {
    return <LoadingSpinner />;
  }

  return (
    <div style={styles.container}>
      <div className="container">
        <div style={styles.header}>
          <h1>{isEditing ? 'Edit Event' : 'Create New Event'}</h1>
          <p style={styles.subtitle}>
            {isEditing ? 'Update your event details' : 'Fill in the details for your new event'}
          </p>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2rem' }}>
              <div>
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter event title"
                    autoComplete="off"
                  />
                  {formErrors.title && (
                    <div style={styles.fieldError}>{formErrors.title}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="location" className="form-label">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter event location"
                    autoComplete="street-address"
                  />
                  {formErrors.location && (
                    <div style={styles.fieldError}>{formErrors.location}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="start_date" className="form-label">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {formErrors.start_date && (
                    <div style={styles.fieldError}>{formErrors.start_date}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="end_date" className="form-label">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {formErrors.end_date && (
                    <div style={styles.fieldError}>{formErrors.end_date}</div>
                  )}
                </div>

                <div style={styles.timeRow}>
                  <div className="form-group">
                    <label htmlFor="start_time" className="form-label">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleChange}
                      className="form-input"
                    />
                    {formErrors.start_time && (
                      <div style={styles.fieldError}>{formErrors.start_time}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="end_time" className="form-label">
                      End Time *
                    </label>
                    <input
                      type="time"
                      id="end_time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleChange}
                      className="form-input"
                    />
                    {formErrors.end_time && (
                      <div style={styles.fieldError}>{formErrors.end_time}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Describe your event..."
                    rows={6}
                  />
                  {formErrors.description && (
                    <div style={styles.fieldError}>{formErrors.description}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="image" className="form-label">
                    Event Image
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="form-input"
                  />
                  {imagePreview && (
                    <div style={styles.imagePreview}>
                      <img 
                        src={imagePreview} 
                        alt="Event preview"
                        style={styles.previewImage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.formActions}>
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || isUploading}
              >
                {isUploading 
                  ? 'Uploading Image...' 
                  : isLoading 
                    ? (isEditing ? 'Updating...' : 'Creating...')
                    : (isEditing ? 'Update Event' : 'Create Event')
                }
              </button>
            </div>
          </form>
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
    textAlign: 'center',
    marginBottom: '2rem',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    marginTop: '0.5rem',
  },
  formContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
    paddingTop: '2rem',
    borderTop: '1px solid #e5e7eb',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '14px',
    maxWidth: '800px',
    margin: '0 auto 1rem',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  },
  imagePreview: {
    marginTop: '1rem',
  },
  previewImage: {
    width: '100%',
    maxWidth: '300px',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  timeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
};

export default CreateEvent;