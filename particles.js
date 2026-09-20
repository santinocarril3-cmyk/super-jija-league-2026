/* ═══════════════════════════════════════════════════════════════════════
   FONDO INTERACTIVO — partículas conectadas (Canvas 2D, sin librerías)
   ───────────────────────────────────────────────────────────────────────
   La idea, en criollo:

   1) Dibujamos N puntitos en un <canvas> que cubre toda la pantalla,
      detrás de todo el contenido (por eso en el CSS tiene z-index: -1).

   2) Unas 60 veces por segundo movemos cada punto un poquito y volvemos
      a dibujar todo el cuadro entero. Eso es lo que genera la sensación
      de movimiento: es la misma idea que un dibujo animado, muchos
      cuadros fijos mostrados rápido, uno detrás del otro.

   3) Si dos puntos están cerca, dibujamos una línea finita entre ellos.
      Cuanto más cerca están, más visible la línea — eso da el efecto
      de "red" o "constelación".

   4) El mouse (o el dedo, en celular) se trata como un punto más: los
      puntos reales se conectan también con él si está lo bastante cerca.

   No usa ninguna librería externa — solo la Canvas API que trae el
   navegador de forma nativa.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Si el usuario activó "reducir movimiento" en su sistema operativo
  // (por mareos, epilepsia fotosensible, etc.), respetamos eso y dejamos
  // los puntos quietos, sin animación.
  const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLOR_PUNTO       = '0, 255, 135'; // var(--verde) en formato "r, g, b"
  const DISTANCIA_LINEA   = 130;           // px máx. para unir 2 puntos entre sí
  const DISTANCIA_MOUSE   = 160;           // px máx. para unir un punto con el mouse

  let ancho, alto;
  let particulas = [];
  let mouse = { x: null, y: null };
  let animando = true;

  // Menos puntos en pantallas chicas (celulares) para no sobrecargarlas.
  function calcularCantidadParticulas() {
    const area = ancho * alto;
    return Math.min(90, Math.round(area / 14000));
  }

  function crearParticulas() {
    const cantidad = calcularCantidadParticulas();
    particulas = [];
    for (let i = 0; i < cantidad; i++) {
      particulas.push({
        x:  Math.random() * ancho,
        y:  Math.random() * alto,
        vx: (Math.random() - 0.5) * 0.4,  // velocidad horizontal, lenta
        vy: (Math.random() - 0.5) * 0.4,  // velocidad vertical, lenta
        r:  Math.random() * 1.5 + 1        // radio del puntito
      });
    }
  }

  function ajustarTamaño() {
    ancho = canvas.width  = window.innerWidth;
    alto  = canvas.height = window.innerHeight;
    crearParticulas();
  }

  function dibujarCuadro() {
    ctx.clearRect(0, 0, ancho, alto);

    // 1) Mover y dibujar cada partícula
    particulas.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Si llega a un borde de la pantalla, "rebota" invirtiendo su velocidad
      if (p.x < 0 || p.x > ancho) p.vx *= -1;
      if (p.y < 0 || p.y > alto)  p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR_PUNTO}, 0.6)`;
      ctx.fill();
    });

    // 2) Unir con una línea las partículas que están cerca entre sí
    for (let i = 0; i < particulas.length; i++) {
      for (let j = i + 1; j < particulas.length; j++) {
        const dx = particulas[i].x - particulas[j].x;
        const dy = particulas[i].y - particulas[j].y;
        const distancia = Math.sqrt(dx * dx + dy * dy);

        if (distancia < DISTANCIA_LINEA) {
          const opacidad = 1 - distancia / DISTANCIA_LINEA; // más cerca = más visible
          ctx.beginPath();
          ctx.moveTo(particulas[i].x, particulas[i].y);
          ctx.lineTo(particulas[j].x, particulas[j].y);
          ctx.strokeStyle = `rgba(${COLOR_PUNTO}, ${opacidad * 0.25})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // 3) Unir con el mouse/dedo las partículas que están cerca de él
    if (mouse.x !== null) {
      particulas.forEach(p => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        if (distancia < DISTANCIA_MOUSE) {
          const opacidad = 1 - distancia / DISTANCIA_MOUSE;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${COLOR_PUNTO}, ${opacidad * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    if (animando) requestAnimationFrame(dibujarCuadro);
  }

  function dibujarCuadroEstatico() {
    // Versión sin movimiento, para "prefers-reduced-motion"
    ctx.clearRect(0, 0, ancho, alto);
    particulas.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR_PUNTO}, 0.4)`;
      ctx.fill();
    });
  }

  // ── Eventos ──────────────────────────────────────────────────────────
  window.addEventListener('resize', ajustarTamaño);

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });

  // { passive: true } le avisa al navegador que no vamos a bloquear el
  // scroll táctil desde este listener — hace que el scroll en celular
  // sea más fluido.
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }, { passive: true });
  window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });

  // Si el usuario cambia de pestaña, pausamos la animación — no tiene
  // sentido gastar batería/CPU dibujando algo que no se está viendo.
  document.addEventListener('visibilitychange', () => {
    animando = !document.hidden;
    if (animando) requestAnimationFrame(dibujarCuadro);
  });

  // ── Arranque ─────────────────────────────────────────────────────────
  ajustarTamaño();
  if (prefiereMenosMovimiento) {
    dibujarCuadroEstatico();
  } else {
    dibujarCuadro();
  }
})();
