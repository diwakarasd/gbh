
// gesture.js
// ======================================================================
//   Hand Gesture Controller for Gargantua Black Hole Engine
//   - Pinch  => Zoom / Scale
//   - Palm tilt => Rotate BH
//   - Spread => Disk pulse / glow increase
// ======================================================================

export const Gesture = {

  enabled: true,

  // raw gesture values
  scale: 1,
  rotX: 0,
  rotY: 0,
  pulse: 0,

  // smoothed values for stable animation
  smoothScale: 1,
  smoothX: 0,
  smoothY: 0,
  smoothPulse: 0,

  // -------------------------------------------------------------
  // Initialize MediaPipe Hands
  // -------------------------------------------------------------
  init(videoEl, onReady) {

    if (typeof Hands === "undefined") {
      console.warn("MediaPipe Hands not available — gesture disabled.");
      Gesture.enabled = false;
      return;
    }

    const hands = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    // -----------------------------------------------------------
    // Process hand results per frame
    // -----------------------------------------------------------
    hands.onResults(results => {

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // relax back to default
        Gesture.scale += (1 - Gesture.scale) * 0.05;
        Gesture.rotX *= 0.9;
        Gesture.rotY *= 0.9;
        Gesture.pulse *= 0.9;
        return;
      }

      const lm = results.multiHandLandmarks[0];

      // ---------------------------------------------------------
      // PINCH amount → scale
      // ---------------------------------------------------------
      const dx = lm[4].x - lm[8].x;
      const dy = lm[4].y - lm[8].y;
      const pinchDist = Math.sqrt(dx*dx + dy*dy);

      Gesture.scale = THREE.MathUtils.clamp(
        0.7 + pinchDist * 5.0,
        0.6, 3.5
      );

      // ---------------------------------------------------------
      // PALM tilt → rotation X/Y
      // ---------------------------------------------------------
      const palmX = (lm[5].x + lm[17].x) / 2 - 0.5;
      const palmY = (lm[5].y + lm[17].y) / 2 - 0.5;

      Gesture.rotY = THREE.MathUtils.clamp(palmX * 5.0, -2.0, 2.0);
      Gesture.rotX = THREE.MathUtils.clamp(palmY * 4.0, -2.0, 2.0);

      // ---------------------------------------------------------
      // SPREAD → pulse (burst of disk brightness)
      // ---------------------------------------------------------
      const spread = Math.hypot(lm[5].x - lm[17].x, lm[5].y - lm[17].y);

      if (spread > 0.35) {
        Gesture.pulse = Math.min(3.0, Gesture.pulse + (spread - 0.35) * 8.0);
      } else {
        Gesture.pulse *= 0.9;
      }
    });

    // -----------------------------------------------------------
    // MediaPipe camera wrapper
    // -----------------------------------------------------------
    const camera = new Camera(videoEl, {
      onFrame: async () => {
        await hands.send({ image: videoEl });
      },
      width: 640,
      height: 480
    });

    camera.start()
      .then(() => {
        console.log("Gesture camera started.");
        if (onReady) onReady();
      })
      .catch(err => {
        console.warn("Gesture camera failed:", err);
        Gesture.enabled = false;
      });
  },

  // -------------------------------------------------------------
  // Smooth gesture transitions for stability
  // -------------------------------------------------------------
  updateSmooth() {
    this.smoothScale += (this.scale - this.smoothScale) * 0.15;
    this.smoothX += (this.rotX - this.smoothX) * 0.15;
    this.smoothY += (this.rotY - this.smoothY) * 0.15;
    this.smoothPulse += (this.pulse - this.smoothPulse) * 0.20;
  }
};
