import React, { useEffect, useRef, useCallback } from 'react';

/**
 * InteractiveParticles — Extraordinary cursor-following particle system
 * Uses Indian tricolour (saffron, white, green) with a chakra-blue accent.
 * - Ambient particles drift continuously and never die (no blank screen).
 * - Click bursts explode and then turn into ambient particles that spread evenly.
 * - Particles gently attract to the cursor, especially when it is still.
 * - Total count is capped so it never overwhelms the screen.
 */

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  life: number;
  maxLife: number;
  type: 'ambient' | 'trail' | 'burst';
}

const FLAG_COLORS = [
  '#FF9933', '#FF9933', '#FF9933',  // Saffron (weighted)
  '#FFFFFF', '#E8E8E8',              // White
  '#138808', '#138808', '#138808',  // Green (weighted)
  '#000080', '#1E3A8A',             // Chakra blue accent
];

const MAX_AMBIENT_PARTICLES = 150; // Hard cap so it doesn't get messy
const INITIAL_AMBIENT = 80;

const InteractiveParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mouseSpeed = useRef(0);
  const idleTimeRef = useRef(0);
  const nextId = useRef(0);

  const randomColor = () => FLAG_COLORS[Math.floor(Math.random() * FLAG_COLORS.length)];

  const createParticle = useCallback((
    x: number, y: number, type: 'ambient' | 'trail' | 'burst'
  ): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const id = nextId.current++;

    if (type === 'ambient') {
      const speed = 0.1 + Math.random() * 0.3;
      return {
        id, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2.5 + 0.8, // Slightly larger base size
        color: randomColor(),
        alpha: 0,
        targetAlpha: Math.random() * 0.3 + 0.1,
        life: 0,
        maxLife: Infinity, // Ambient particles never die naturally
        type,
      };
    }

    if (type === 'trail') {
      const speed = 1 + Math.random() * 2;
      return {
        id, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color: randomColor(),
        alpha: 0.8,
        targetAlpha: 0,
        life: 0,
        maxLife: 40 + Math.random() * 40,
        type,
      };
    }

    // burst
    const speed = 4 + Math.random() * 6;
    return {
      id, x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      color: randomColor(),
      alpha: 1,
      targetAlpha: Math.random() * 0.3 + 0.1, // They will settle into ambient alpha
      life: 0,
      maxLife: 60 + Math.random() * 30, // Time until they transition to ambient
      type,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    // Initialize ambient particles
    const particles = particlesRef.current;
    for (let i = 0; i < INITIAL_AMBIENT; i++) {
      const p = createParticle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        'ambient'
      );
      p.alpha = p.targetAlpha; // Start fully visible
      particles.push(p);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      // Calculate mouse speed
      const dx = newX - lastMousePos.current.x;
      const dy = newY - lastMousePos.current.y;
      mouseSpeed.current = Math.sqrt(dx * dx + dy * dy);
      lastMousePos.current = { x: newX, y: newY };

      mouseRef.current = { x: newX, y: newY, active: true };
      idleTimeRef.current = 0; // Reset idle timer

      // Emit trail particles proportional to speed (only if moving significantly)
      if (mouseSpeed.current > 1) {
        const count = Math.min(Math.floor(mouseSpeed.current / 4), 3);
        for (let i = 0; i < count; i++) {
          particles.push(createParticle(
            newX + (Math.random() - 0.5) * 15,
            newY + (Math.random() - 0.5) * 15,
            'trail'
          ));
        }
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      idleTimeRef.current = 0;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Burst of particles on click
      // Calculate how many we can add without exceeding MAX_AMBIENT_PARTICLES too much
      const ambientCount = particles.filter(p => p.type === 'ambient' || p.type === 'burst').length;
      const burstSize = Math.min(20, MAX_AMBIENT_PARTICLES - ambientCount + 10);
      
      for (let i = 0; i < Math.max(5, burstSize); i++) {
        particles.push(createParticle(x, y, 'burst'));
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;
      
      if (mouse.active && mouseSpeed.current < 0.5) {
          idleTimeRef.current++;
      } else if (mouseSpeed.current >= 0.5) {
          idleTimeRef.current = 0;
      }
      mouseSpeed.current *= 0.9; // decay mouse speed reading

      // Draw cursor glow
      if (mouse.active) {
        const baseRadius = 100;
        // Pulse slightly when idle
        const idlePulse = idleTimeRef.current > 30 ? Math.sin(idleTimeRef.current * 0.05) * 20 : 0;
        const glowRadius = baseRadius + mouseSpeed.current * 1.5 + idlePulse;
        
        const gradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, Math.max(10, glowRadius)
        );
        gradient.addColorStop(0, 'rgba(255, 153, 51, 0.08)');  // Saffron center
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)'); // White ring
        gradient.addColorStop(0.6, 'rgba(19, 136, 8, 0.06)');  // Green ring
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(
          mouse.x - glowRadius, mouse.y - glowRadius,
          glowRadius * 2, glowRadius * 2
        );
      }

      // Check for neutron star blast condition
      let denseCount = 0;
      if (mouse.active && idleTimeRef.current > 30) {
          for (let i = 0; i < particles.length; i++) {
              const dx = mouse.x - particles[i].x;
              const dy = mouse.y - particles[i].y;
              if (dx * dx + dy * dy < 2500) { // dist < 50
                  denseCount++;
              }
          }
      }
      
      let isBlasting = false;
      if (denseCount > 40) { // If more than 40 particles are very close
          isBlasting = true;
          idleTimeRef.current = -40; // Negative idle time prevents immediate re-attraction
          // Create extra blast particles
          for (let i = 0; i < 20; i++) {
               particles.push(createParticle(mouse.x, mouse.y, 'burst'));
          }
      }

      let currentAmbientCount = 0;

      // Update & draw particles (iterate backwards for safe splicing)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        if (p.type === 'trail') {
             if (p.life > p.maxLife) {
                 particles.splice(i, 1);
                 continue;
             }
             // Fade out over life
             p.alpha = Math.max(0, p.alpha - 0.02);
        } else if (p.type === 'burst') {
            if (p.life > p.maxLife) {
                // Convert burst to ambient so they stay on screen and spread out
                p.type = 'ambient';
                p.maxLife = Infinity;
                // Give them a gentle random wander velocity
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.1 + Math.random() * 0.3;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            } else {
                // Heavy friction for burst particles before they settle
                p.vx *= 0.93;
                p.vy *= 0.93;
                // Transition alpha to target alpha
                p.alpha += (p.targetAlpha - p.alpha) * 0.05;
            }
        } else if (p.type === 'ambient') {
            currentAmbientCount++;
            // Fade in initially
            if (p.alpha < p.targetAlpha) {
                p.alpha += 0.01;
            }
            
            // If screen is getting too crowded with ambient particles, very slowly fade out excess ones
            if (currentAmbientCount > MAX_AMBIENT_PARTICLES && Math.random() < 0.01) {
                p.targetAlpha = 0;
            }
            
            // Delete ambient particles that have completely faded out
            if (p.targetAlpha === 0 && p.alpha <= 0.01) {
                 particles.splice(i, 1);
                 continue;
            }
        }

        // --- Interaction Physics ---
        if ((p.type === 'ambient' || p.type === 'burst') && mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (isBlasting && dist < 250) {
              // NEUTRON STAR BLAST!
              const angle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.5; // Outward angle
              const blastSpeed = 12 + Math.random() * 15;
              p.vx = Math.cos(angle) * blastSpeed;
              p.vy = Math.sin(angle) * blastSpeed;
              p.alpha = 1;
              p.type = 'burst'; // make them act like bursts so they decelerate nicely
              p.life = 0;
              p.maxLife = 60 + Math.random() * 20;

          } else if (dist < 350) {
            // If cursor is still (idle), attract particles strongly
            // If cursor is moving fast, gently repel or scatter them
            
            if (idleTimeRef.current > 10) {
                // Attract
                const force = 0.015 * (1 - dist / 350);
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
                
                // Keep them circling slightly instead of just converging to a single point
                const tangentVx = -dy / dist * force * 0.5;
                const tangentVy = dx / dist * force * 0.5;
                p.vx += tangentVx;
                p.vy += tangentVy;
                
                // Brighten particles near the idle cursor
                p.alpha = Math.min(0.8, p.alpha + 0.02);
            } else if (mouseSpeed.current > 5 && dist < 150) {
                // Repel lightly if cursor is moving fast through them
                const force = 0.05 * (1 - dist / 150);
                p.vx -= (dx / dist) * force;
                p.vy -= (dy / dist) * force;
            }
          } else {
              // Return to ambient wander if far from cursor
              if (p.type === 'ambient') {
                  // Normalize speed to ambient levels (~0.3)
                  const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                  if (currentSpeed > 0.4) {
                      p.vx *= 0.95;
                      p.vy *= 0.95;
                  } else if (currentSpeed < 0.1 && Math.random() < 0.05) {
                      const angle = Math.random() * Math.PI * 2;
                      p.vx += Math.cos(angle) * 0.05;
                      p.vy += Math.sin(angle) * 0.05;
                  }
                  
                  // Return to normal target alpha
                  if (p.targetAlpha > 0) {
                      p.alpha += (p.targetAlpha - p.alpha) * 0.01;
                  }
              }
          }
        }

        // Apply velocity
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.type !== 'burst') {
            // Base friction for non-burst
            p.vx *= 0.99;
            p.vy *= 0.99;
        }

        // Wrapping boundaries for ambient particles to ensure they never disappear
        if (p.type === 'ambient') {
            if (p.x < -20) p.x = canvas.width + 20;
            if (p.x > canvas.width + 20) p.x = -20;
            if (p.y < -20) p.y = canvas.height + 20;
            if (p.y > canvas.height + 20) p.y = -20;
        }

        // Draw particle
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto z-[1]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

export default InteractiveParticles;
