import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import AnimatedBackground from '../components/AnimatedBackground';

const LandingPage = () => {
  return (
    <div className="App-main">
      {/* Hero Section */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatedBackground style={{ zIndex: 1 }} />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1>Welcome to</h1>
          <img 
            src="gifs/logo_white.gif" 
            alt="Host Buddy Logo" 
            style={{
              height: '150px',
              padding: '10px'
            }} 
          />
          <p>
            Your ultimate event management platform. 
          </p>
          {/* Plan, manage, and share unforgettable events with ease. */}
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Everything you need to host amazing events</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                📅
              </div>
              <h3>Plan</h3>
              <p>
                Create detailed event plans with our intuitive interface. 
                Set dates, locations, and manage all the essential details 
                in one place.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                🎯
              </div>
              <h3>Manage</h3>
              <p>
                Track your events, manage guest lists, and coordinate 
                all aspects of your event from a centralized dashboard.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                🚀
              </div>
              <h3>Share</h3>
              <p>
                Share event details with guests, create custom layouts, 
                and export professional materials for your events.
              </p>
            </div>
          </div>

          <div style={styles.additionalFeatures}>
            <h3>Advanced Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '2rem', marginTop: '2rem' }}>
              <div style={styles.featureItem}>
                <h4>🎨 Layout Designer</h4>
                <p>Create custom seating arrangements and event layouts with our drag-and-drop designer.</p>
              </div>
              <div style={styles.featureItem}>
                <h4>📊 Analytics</h4>
                <p>Track event performance and guest engagement with detailed analytics.</p>
              </div>
              <div style={styles.featureItem}>
                <h4>📱 Mobile Friendly</h4>
                <p>Manage your events on the go with our responsive mobile interface.</p>
              </div>
              <div style={styles.featureItem}>
                <h4>☁️ Cloud Storage</h4>
                <p>Secure cloud storage for all your event photos and documents.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <div className="container text-center">
          <h2 style={styles.ctaTitle}>Ready to host your next event?</h2>
          <p style={styles.ctaText}>
            Join thousands of event organizers who trust Host Buddy
          </p>
          <Link to="/signup" className="btn btn-primary" style={styles.ctaButton}>
            Start Planning Today
          </Link>
        </div>
      </section>

      {/* <Footer /> */}
    </div>
  );
};

const styles = {
  additionalFeatures: {
    marginTop: '4rem',
    textAlign: 'center',
  },
  featureItem: {
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'left',
  },
  ctaSection: {
    backgroundColor: '#f3f4f6',
    padding: '4rem 0',
  },
  ctaTitle: {
    fontSize: '2.5rem',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  ctaText: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },
  ctaButton: {
    fontSize: '1.1rem',
    padding: '16px 32px',
  },
};

export default LandingPage;