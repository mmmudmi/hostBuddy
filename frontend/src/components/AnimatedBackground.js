import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className, style }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not found');
      return;
    }

    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    resizeCanvas();

    // Simple canvas test first - draw a blue rectangle
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    // Now try Paper.js
    try {
      const paper = require('paper');
      paper.setup(canvas);

      var width, height, center;
      var points = 10;
      var smooth = true;
      var path = new paper.Path();
      var mousePos = paper.view.center.divide(2);
      var pathHeight = mousePos.y;
      path.fillColor = new paper.Color(1, 1, 1, 0.06);
      
      function initializePath() {
        center = paper.view.center;
        width = paper.view.size.width;
        height = paper.view.size.height * 0.7;
        path.segments = [];
        path.add(paper.view.bounds.bottomLeft);
        for (var i = 1; i < points; i++) {
          var point = new paper.Point(width / points * i, center.y);
          path.add(point);
        }
        path.add(paper.view.bounds.bottomRight);
      }

      function onFrame(event) {
        pathHeight += (center.y - mousePos.y - pathHeight) / 10;
        for (var i = 1; i < points; i++) {
          var sinSeed = event.count + (i + i % 10) * 100;
          var sinHeight = Math.sin(sinSeed / 200) * pathHeight;
          var yPos = Math.sin(sinSeed / 100) * sinHeight + height;
          path.segments[i].point.y = yPos;
        }
        if (smooth)
          path.smooth({ type: 'continuous' });
      }

      function onMouseMove(event) {
        mousePos = event.point;
      }

      function onMouseDown(event) {
        smooth = !smooth;
        if (!smooth) {
          for (var i = 0, l = path.segments.length; i < l; i++) {
            var segment = path.segments[i];
            segment.handleIn = segment.handleOut = null;
          }
        }
      }

      function onResize(event) {
        resizeCanvas();
        initializePath();
      }

      // Initialize
      initializePath();

      // Set up Paper.js event handlers
      paper.view.onFrame = onFrame;
      paper.view.onMouseMove = onMouseMove;
      paper.view.onMouseDown = onMouseDown;
      paper.view.onResize = onResize;

    } catch (error) {
      console.error('Paper.js error:', error);
    }

    // Handle window resize
    const handleWindowResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleWindowResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 1,
        ...style
      }}
    />
  );
};

export default AnimatedBackground;