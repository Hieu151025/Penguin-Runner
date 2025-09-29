(() => {
    // ====== Config ======
    const W = 960, H = 320;
    const groundY = H - 48;
    const gravity = 0.8;
    const jumpVy = -14;
    const baseSpeed = 6;
    const speedRamp = 0.0004;
    const spawnMin = 900, spawnMax = 1600;
  
    // ====== State ======
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');
  
    let best = Number(localStorage.getItem('penguin_best')||0);
    bestEl.textContent = best;
  
    const penguin = {
      x: 90, y: groundY, w: 36, h: 48, vy: 0,
      onGround: true, ducking: false, duckTimer: 0,
    };
  
    let obstacles = [];
    let running = true, gameOver = false;
    let last = performance.now(), timeSinceSpawn = 0, nextSpawn = rand(spawnMin, spawnMax);
    let t = 0, score = 0;
  
    // ====== Helpers ======
    function rand(a,b){ return Math.random()*(b-a)+a; }
    function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  
    function reset(){
      obstacles = []; running = true; gameOver = false;
      penguin.y = groundY; penguin.vy = 0; penguin.onGround = true; penguin.ducking = false;
      last = performance.now(); timeSinceSpawn = 0; nextSpawn = rand(spawnMin, spawnMax);
      t = 0; score = 0; scoreEl.textContent = 0;
    }
  
    // ====== Input ======
    window.addEventListener('keydown', e => {
      if (['ArrowUp','ArrowDown','Space',' '].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowUp' || e.key === ' ') jump();
      if (e.key === 'ArrowDown') duck(true);
      if (e.key === 'Enter' && gameOver) reset();
    });
    window.addEventListener('keyup', e => { if (e.key === 'ArrowDown') duck(false); });
  
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width/2) duck(true); else jump();
    });
    canvas.addEventListener('pointerup', () => duck(false));
  
    pauseBtn.addEventListener('click', () => { running = !running; pauseBtn.textContent = running ? 'Tạm dừng' : 'Tiếp tục'; });
    restartBtn.addEventListener('click', reset);
  
    function jump(){ if (!gameOver && penguin.onGround && !penguin.ducking){ penguin.vy = jumpVy; penguin.onGround = false; } }
    function duck(d){ if (!gameOver){ penguin.ducking = d; if (d) penguin.duckTimer = 0; } }
  
    // ====== Game Loop ======
    function loop(now){
      const dt = Math.min(32, now - last); last = now;
      if (running && !gameOver){ update(dt); }
      draw(); requestAnimationFrame(loop);
    }
  
    function update(dt){
      t += dt;
      const speed = baseSpeed + t * speedRamp;
      penguin.vy += gravity; penguin.y += penguin.vy;
      let targetH = penguin.ducking ? 30 : 48;
      penguin.h += (targetH - penguin.h) * 0.3;
      if (penguin.y >= groundY){ penguin.y = groundY; penguin.vy = 0; penguin.onGround = true; }
      else penguin.onGround = false;
  
      // Spawn obstacles
      timeSinceSpawn += dt;
      if (timeSinceSpawn >= nextSpawn){
        timeSinceSpawn = 0; nextSpawn = rand(spawnMin*0.9, spawnMax*0.9);
        const type = Math.random() < 0.6 ? 'ground' : 'over';
        if (type === 'ground'){
          const h = rand(34, 60);
          obstacles.push({ x: W+10, y: groundY-h, w: rand(28, 44), h, type });
        } else {
          const h = 32, y = groundY-70-rand(0,14);
          obstacles.push({ x: W+10, y, w: rand(60, 90), h, type });
        }
      }
  
      // Move & collide
      for (let i=obstacles.length-1;i>=0;i--){
        const o = obstacles[i]; o.x -= speed;
        if (o.x + o.w < -50) { obstacles.splice(i,1); continue; }
        if (!o.scored && o.x + o.w < penguin.x){ o.scored = true; score++; scoreEl.textContent = score; }
        const pRect = { x: penguin.x-10, y: penguin.y-penguin.h, w:36, h:penguin.h };
        if (rectsOverlap(pRect,o)){ gameOver = true; running = false;
          best = Math.max(best, score); localStorage.setItem('penguin_best', best); bestEl.textContent = best; }
      }
    }
  
    function rectsOverlap(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  
    // ====== Drawing ======
    function drawBackground(){
      ctx.save();
      for (let i=0;i<6;i++){ const x=((i*170+(t*0.03))%(W+220))-110; const y=40+(i%3)*22; drawCloud(x,y); }
      ctx.fillStyle='rgba(17,24,39,0.9)'; ctx.fillRect(0, groundY+1, W, H-groundY);
      ctx.restore();
    }
    function drawCloud(x,y){ ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath();
      ctx.ellipse(x, y, 24, 14, 0, 0, Math.PI*2);
      ctx.ellipse(x+18, y+4, 18, 11, 0, 0, Math.PI*2);
      ctx.ellipse(x-18, y+6, 16, 10, 0, 0, Math.PI*2); ctx.fill(); }
    function drawPenguin(){ const x=penguin.x, yTop=penguin.y-penguin.h;
      roundRect(x-12,yTop,24,penguin.h,8,'#0f172a');
      roundRect(x-9,yTop+10,18,Math.max(10,penguin.h-16),6,'#e5e7eb');
      roundRect(x-22,yTop+12,12,Math.min(16,penguin.h-18),6,'#111827');
      ctx.fillStyle='#f59e0b'; ctx.beginPath(); ctx.moveTo(x+10,yTop+14); ctx.lineTo(x+22,yTop+18); ctx.lineTo(x+10,yTop+22); ctx.fill();
      ctx.fillStyle='#111827'; ctx.beginPath(); ctx.arc(x+2,yTop+14,2.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f59e0b'; ctx.fillRect(x-10,penguin.y-4,10,4); ctx.fillRect(x,penguin.y-4,10,4);
    }
    function drawObstacles(){ for(const o of obstacles){ ctx.fillStyle=o.type==='ground'?'#10b981':'#ef4444'; roundRect(o.x,o.y,o.w,o.h,6,ctx.fillStyle); } }
    function roundRect(x,y,w,h,r,fill){ const rr=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+rr,y);
      ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
      if (fill){ ctx.fillStyle=fill; ctx.fill(); } }
    function drawHUD(){ if (gameOver){ ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='bold 24px system-ui'; ctx.textAlign='center'; ctx.fillText('Thua rồi! Nhấn Enter hoặc Chơi lại', W/2, H/2); } }
    function draw(){ ctx.clearRect(0,0,W,H); drawBackground(); drawObstacles(); drawPenguin(); drawHUD(); }
  
    // Start
    reset(); requestAnimationFrame(loop);
  })();
  