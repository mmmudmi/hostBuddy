import React from 'react';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div className="container">
        {/* <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h3 style={styles.footerTitle}>Host Buddy</h3>
            <p style={styles.footerText}>
              Your ultimate event management platform
            </p>
          </div>
          
          <div style={styles.footerSection}>
            <h4 style={styles.footerSubtitle}>Features</h4>
            <ul style={styles.footerList}>
              <li>Event Planning</li>
              <li>Guest Management</li>
              <li>Layout Design</li>
              <li>Analytics</li>
            </ul>
          </div>
          
          <div style={styles.footerSection}>
            <h4 style={styles.footerSubtitle}>Support</h4>
            <ul style={styles.footerList}>
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
          
          <div style={styles.footerSection}>
            <h4 style={styles.footerSubtitle}>Connect</h4>
            <ul style={styles.footerList}>
              <li>Twitter</li>
              <li>Facebook</li>
              <li>LinkedIn</li>
              <li>Instagram</li>
            </ul>
          </div>
        </div> */}
        
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>
            Pearploy Chaicharoensin
          </p>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#1f2937',
    color: 'white',
    padding: '3rem 0 1rem',
    marginTop: 'auto',
  },
  footerContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem',
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  footerTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: '#3b82f6',
  },
  footerSubtitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  footerText: {
    color: '#9ca3af',
    lineHeight: '1.6',
  },
  footerList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  footerBottom: {
    borderTop: '1px solid #374151',
    paddingTop: '1rem',
    textAlign: 'center',
  },
  copyright: {
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
};

export default Footer;