import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const LandingPage = () => {
  return (
    <div className="App-main">
      {/* Hero Section */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* <AnimatedBackground style={{ zIndex: 1 }} /> */}
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
            <Link to="/signup" className="btn btn-primary" style={{background: '#ff7dbcff', fontSize: '1.2rem'}}>
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <img 
                  src="/svg/ReadingDoodle.svg" 
                  alt="Planning" 
                />
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
                <img 
                  src="/svg/MessyDoodle.svg" 
                  alt="Managing" 
                />
              </div>
              <h3>Manage</h3>
              <p>
                Track your events, manage guest lists, and coordinate 
                all aspects of your event from a centralized dashboard.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <img 
                  src="/svg/DancingDoodle.svg" 
                  alt="Sharing" 
                />
              </div>
              <h3>Share</h3>
              <p>
                Share event details with guests, create custom layouts, 
                and export professional materials for your events.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Demos Section */}
      <section style={styles.DemoSection}>
        <div className="container">
          <div style={styles.DemoContainer}>
            {/* Left side - GIF Container */}
            <div style={styles.gifContainer}>
              <div>
                <img 
                  src="/gifs/auto_number.gif" 
                  alt="Auto Number Feature Demo" 
                  style={styles.demoGif}
                />
              </div>
            </div>
            
            {/* Right side - Content */}
            <div style={styles.autoNumberContent}>
              <div style={styles.contentWrapper}>
                <h3 style={styles.featureDemoTitle}>Auto Number Elements</h3>
                <p style={styles.featureDemoDescription}>
                  Automatically number your event elements with just one click. 
                  Perfect for seating arrangements, table numbers, or any sequential numbering needs. 
                  Save time and ensure accuracy in your event layouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Save Elements Demo Section */}
      <section style={{...styles.DemoSection, backgroundColor: '#ffffffff'}}>
        <div className="container">
          <div style={styles.DemoContainer}>
            {/* Left side - Content */}
            <div style={styles.saveElementsContent}>
              <div style={styles.contentWrapper}>
                <h3 style={styles.featureDemoTitle}>Save Elements for Later</h3>
                <p style={styles.featureDemoDescription}>
                  Create custom elements and save them to your personal library. 
                  Reuse your favorite designs across multiple events and build 
                  your own collection of event elements.
                </p>
              </div>
            </div>
            
            {/* Right side - GIF Container */}
            <div style={styles.gifContainer}>
              <div>
                <img 
                  src="/gifs/my_elements.gif" 
                  alt="Save Elements Feature Demo" 
                  style={styles.demoGif}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {}{/* Footer */}
      <Footer />
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
  gifContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoNumberContent: {
    position: 'relative',
    padding: '2rem 0',
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 2,
    textAlign: 'center',
  },
  featureDemoTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1.5rem',
    lineHeight: '1.2',
  },
  featureDemoDescription: {
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.7',
    margin: 0,
  },
  
  // Save Elements Demo Section
  DemoSection: {
    padding: '6rem 0',
    backgroundColor: '#ffeff7ff', 
    position: 'relative',
    overflow: 'hidden',
  },
  DemoContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  saveElementsContent: {
    position: 'relative',
    padding: '2rem 0',
  },
  demoTitle: {
    fontSize: '2.5rem',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '2.5rem',
    fontWeight: 'bold',
  },
  demoGif: {
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    maxWidth: '500px',
    objectFit: 'contain',
  },
  demoFeatureTitle: {
    fontSize: '1.5rem',
    color: '#1f2937',
    marginBottom: '1rem',
    fontWeight: '600',
  },
  demoDescription: {
    fontSize: '1rem',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: 0,
  },
};

export default LandingPage;