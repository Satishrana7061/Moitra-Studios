import React, { useEffect, useRef, useCallback } from 'react';

/**
 * InteractiveParticles — Extraordinary cursor-following particle system
 * Uses Indian tricolour (saffron, white, green) with a chakra-blue accent.
 * Particles drift lazily until the cursor moves, then they rush toward it,
 * creating a magnetic flag-themed aurora effect over the India map.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
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

const InteractiveParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mouseSpeed = useRef(0);

  const randomColor = () => FLAG_COLORS[Math.floor(Math.random() * FLAG_COLORS.length)];

  const createParticle = useCallback((
    x: number, y: number, type: 'ambient' | 'trail' | 'burst'
  ): Particle => {
    const angle = Math.random() * Math.PI * 2;

    if (type === 'ambient') {
      return {
        x, y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.15, // slow upward drift
        size: Math.random() * 2.5 + 0.5,
        color: randomColor(),
        alpha: Math.random() * 0.25 + 0.05,
        life: 0,
        maxLife: 300 + Math.random() * 400,
        type,
      };
    }

    if (type === 'trail') {
      const speed = 1 + Math.random() * 2;
      return {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1,
        color: randomColor(),
        alpha: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 40 + Math.random() * 60,
        type,
      };
    }

    // burst
    const speed = 3 + Math.random() * 5;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 4 + 2,
      color: randomColor(),
      alpha: 0.8 + Math.random() * 0.2,
      life: 0,
      maxLife: 30 + Math.random() * 40,
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
    for (let i = 0; i < 80; i++) {
      particles.push(createParticle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        'ambient'
      ));
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

      // Emit trail particles proportional to speed
      const count = Math.min(Math.floor(mouseSpeed.current / 3), 6);
      for (let i = 0; i < count; i++) {
        particles.push(createParticle(
          newX + (Math.random() - 0.5) * 20,
          newY + (Math.random() - 0.5) * 20,
          'trail'
        ));
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Burst of particles on click
      for (let i = 0; i < 25; i++) {
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

      // Draw cursor glow
      if (mouse.active) {
        const glowRadius = 120 + mouseSpeed.current * 2;
        const gradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, glowRadius
        );
        gradient.addColorStop(0, 'rgba(255, 153, 51, 0.08)');  // Saffron center
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)'); // White ring
        gradient.addColorStop(0.6, 'rgba(19, 136, 8, 0.06)');  // Green ring
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(
          mouse.x - glowRadius, mouse.y - glowRadius,
          glowRadius * 2, glowRadius * 2
        );
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        if (p.life > p.maxLife) {
          if (p.type === 'ambient') {
            // Respawn ambient particles
            p.x = Math.random() * canvas.width;
            p.y = canvas.height + 10;
            p.life = 0;
            p.alpha = Math.random() * 0.25 + 0.05;
            p.color = randomColor();
            p.maxLife = 300 + Math.random() * 400;
          } else {
            particles.splice(i, 1);
            continue;
          }
        }

        // Gentle magnetic pull toward cursor for ambient particles
        if (p.type === 'ambient' && mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const force = 0.02 * (1 - dist / 250);
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            // Brighten nearby particles
            p.alpha = Math.min(0.6, p.alpha + 0.005);
          }
        }

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Calculate display alpha with life fade
        const lifeFraction = p.life / p.maxLife;
        let displayAlpha = p.alpha;
        if (lifeFraction > 0.7) {
          displayAlpha *= 1 - (lifeFraction - 0.7) / 0.3;
        }
        if (lifeFraction < 0.1 && p.type !== 'ambient') {
          displayAlpha *= lifeFraction / 0.1;
        }

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = displayAlpha;
        ctx.shadowBlur = p.size * 4;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Cap particle count  
      if (particles.length > 500) {
        particles.splice(0, particles.length - 500);
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
