(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var background = document.createElement("div");
  background.setAttribute("aria-hidden", "true");
  background.style.cssText = "position:fixed;inset:0;z-index:1;overflow:hidden;pointer-events:none;";
  document.body.appendChild(background);

  var canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  background.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  function resize() {
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var ripples = [];
  function addRipple(x, y) {
    if (ripples.length < 12) {
      ripples.push({ x: x, y: y, r: 6, alpha: 0.45 });
    }
  }
  window.addEventListener("click", function (event) {
    addRipple(event.clientX, event.clientY);
  });

  function drawWater(t) {
    var w = window.innerWidth, h = window.innerHeight;
    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#dbe9e2");
    gradient.addColorStop(0.55, "#e6ede4");
    gradient.addColorStop(1, "#faf6ee");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    var waves = [
      { base: 0.28, amp: 9, speed: 0.0004, phase: 0, alpha: 0.30 },
      { base: 0.52, amp: 13, speed: 0.0003, phase: 2, alpha: 0.22 },
      { base: 0.76, amp: 17, speed: 0.00022, phase: 4, alpha: 0.16 }
    ];
    for (var i = 0; i < waves.length; i++) {
      var wave = waves[i];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += 10) {
        var y = h * wave.base + Math.sin(x * 0.008 + t * wave.speed + wave.phase) * wave.amp + Math.sin(x * 0.02 - t * wave.speed * 0.7) * wave.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = "rgba(170, 205, 195, " + (wave.alpha * 0.5) + ")";
      ctx.fill();
      ctx.beginPath();
      for (var x2 = 0; x2 <= w; x2 += 10) {
        var y2 = h * wave.base + Math.sin(x2 * 0.008 + t * wave.speed + wave.phase) * wave.amp + Math.sin(x2 * 0.02 - t * wave.speed * 0.7) * wave.amp * 0.4;
        if (x2 === 0) { ctx.moveTo(x2, y2); } else { ctx.lineTo(x2, y2); }
      }
      ctx.strokeStyle = "rgba(100, 140, 130, " + wave.alpha + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (var j = ripples.length - 1; j >= 0; j--) {
      var ripple = ripples[j];
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(90, 130, 120, " + ripple.alpha + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  var lastWater = performance.now();
  var nextRipple = lastWater + 2000;
  function waterFrame(now) {
    var dt = Math.min(0.05, (now - lastWater) / 1000);
    lastWater = now;
    if (now >= nextRipple) {
      addRipple(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
      nextRipple = now + 1800 + Math.random() * 2000;
    }
    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].r += 28 * dt;
      ripples[i].alpha -= 0.3 * dt;
      if (ripples[i].alpha <= 0) { ripples.splice(i, 1); }
    }
    drawWater(now);
    requestAnimationFrame(waterFrame);
  }
  if (reduced) {
    drawWater(0);
  } else {
    requestAnimationFrame(waterFrame);
  }

  var sky = document.createElement("div");
  sky.style.cssText = "position:absolute;inset:0;overflow:hidden;";
  background.appendChild(sky);

  if (!reduced) {
    for (var i = 0; i < 24; i++) {
      var dot = document.createElement("span");
      var size = 2 + Math.random() * 2;
      dot.style.cssText = "position:absolute;border-radius:50%;background:#b8ad9c;opacity:0.2;width:" + size + "px;height:" + size + "px;left:" + (Math.random() * 100) + "%;top:" + (Math.random() * 100) + "%;animation:twinkle " + (4 + Math.random() * 5) + "s ease-in-out " + (Math.random() * 5) + "s infinite alternate;";
      sky.appendChild(dot);
    }
    var style = document.createElement("style");
    style.textContent = "@keyframes twinkle{from{opacity:0.08}to{opacity:0.35}}";
    document.head.appendChild(style);
  }

  var moth = document.createElement("div");
  moth.title = "A doily wave moth, passing through.";
  moth.style.cssText = "position:absolute;width:46px;height:32px;z-index:10;cursor:pointer;pointer-events:auto;";
  moth.innerHTML = '<svg viewBox="0 0 64 40" width="46" height="32"><g class="wing-left"><path d="M32 20 C22 4 6 2 7 15 C8 27 20 28 32 22 Z" fill="#e9dfc9" stroke="#6b6257" stroke-width="1"/></g><g class="wing-right"><path d="M32 20 C42 4 58 2 57 15 C56 27 44 28 32 22 Z" fill="#e9dfc9" stroke="#6b6257" stroke-width="1"/></g><ellipse cx="32" cy="20" rx="2.5" ry="10" fill="#6b6257"/><path d="M30 11 C27 6 25 5 23 4 M34 11 C37 6 39 5 41 4" fill="none" stroke="#6b6257" stroke-width="1"/></svg>';
  background.appendChild(moth);

  var wingStyle = document.createElement("style");
  wingStyle.textContent = ".wing-left{transform-box:fill-box;transform-origin:right center;animation:flap 0.7s ease-in-out infinite alternate}.wing-right{transform-box:fill-box;transform-origin:left center;animation:flap 0.7s ease-in-out infinite alternate}@keyframes flap{from{transform:scaleX(0.7)}to{transform:scaleX(1)}}.moth-resting .wing-left,.moth-resting .wing-right{animation-duration:2s}";
  document.head.appendChild(wingStyle);

  if (reduced) {
    moth.style.left = "calc(100% - 70px)";
    moth.style.top = "24px";
    moth.classList.add("moth-resting");
    return;
  }

  var x = -60, y = window.innerHeight * 0.25;
  var vx = 20, vy = 0;
  var movingUntil = performance.now() + 8000;
  var restingUntil = 0;
  var resting = false;
  var boostUntil = 0;
  var last = performance.now();

  function randn() {
    var u = Math.max(1e-9, Math.random());
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  moth.addEventListener("click", function () {
    var angle = Math.random() * 2 * Math.PI;
    vx = Math.cos(angle) * 190;
    vy = Math.sin(angle) * 190;
    resting = false;
    boostUntil = performance.now() + 1600;
    movingUntil = performance.now() + 8000;
  });

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (resting && now >= restingUntil) {
      resting = false;
      movingUntil = now + 5000 + Math.random() * 7000;
      var kick = Math.random() * 2 * Math.PI;
      vx = Math.cos(kick) * 15;
      vy = Math.sin(kick) * 15;
    }
    if (!resting && now > movingUntil) {
      resting = true;
      restingUntil = now + 3000 + Math.random() * 5000;
    }
    if (resting) {
      moth.classList.add("moth-resting");
      var settle = Math.exp(-3 * dt);
      vx *= settle;
      vy *= settle;
    } else {
      moth.classList.remove("moth-resting");
      var sigma = 35;
      var kickScale = sigma * Math.sqrt(dt);
      vx += randn() * kickScale;
      vy += randn() * kickScale;
      var damp = Math.exp(-0.9 * dt);
      vx *= damp;
      vy *= damp;
      var speed = Math.sqrt(vx * vx + vy * vy);
      var maxSpeed = now < boostUntil ? 200 : 60;
      if (speed > maxSpeed) {
        vx = (vx / speed) * maxSpeed;
        vy = (vy / speed) * maxSpeed;
      }
      if (Math.abs(vx) > 5) {
        moth.style.transform = "scaleX(" + (vx < 0 ? -1 : 1) + ")";
      }
    }
    x += vx * dt;
    y += vy * dt;
    var margin = 20;
    if (x < margin) { x = margin; vx = Math.abs(vx); }
    if (x > window.innerWidth - 70) { x = window.innerWidth - 70; vx = -Math.abs(vx); }
    if (y < margin) { y = margin; vy = Math.abs(vy); }
    if (y > window.innerHeight - 60) { y = window.innerHeight - 60; vy = -Math.abs(vy); }
    moth.style.left = x + "px";
    moth.style.top = y + "px";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
