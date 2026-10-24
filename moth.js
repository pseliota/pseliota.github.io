(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sky = document.createElement("div");
  sky.setAttribute("aria-hidden", "true");
  sky.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;";
  document.body.appendChild(sky);

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
  moth.setAttribute("aria-hidden", "true");
  moth.title = "A doily wave moth, passing through.";
  moth.style.cssText = "position:fixed;width:46px;height:32px;z-index:10;cursor:pointer;pointer-events:auto;";
  moth.innerHTML = '<svg viewBox="0 0 64 40" width="46" height="32"><g class="wing-left"><path d="M32 20 C22 4 6 2 7 15 C8 27 20 28 32 22 Z" fill="#e9dfc9" stroke="#6b6257" stroke-width="1"/></g><g class="wing-right"><path d="M32 20 C42 4 58 2 57 15 C56 27 44 28 32 22 Z" fill="#e9dfc9" stroke="#6b6257" stroke-width="1"/></g><ellipse cx="32" cy="20" rx="2.5" ry="10" fill="#6b6257"/><path d="M30 11 C27 6 25 5 23 4 M34 11 C37 6 39 5 41 4" fill="none" stroke="#6b6257" stroke-width="1"/></svg>';
  document.body.appendChild(moth);

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
  var targetX = window.innerWidth * 0.7, targetY = window.innerHeight * 0.2;
  var pausedUntil = 0, boostUntil = 0;
  var last = performance.now();

  function pickTarget() {
    var margin = 70;
    targetX = margin + Math.random() * Math.max(100, window.innerWidth - margin * 2);
    targetY = margin + Math.random() * Math.max(100, window.innerHeight - margin * 2);
  }

  moth.addEventListener("click", function () {
    pickTarget();
    boostUntil = performance.now() + 1600;
    pausedUntil = 0;
  });

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (now < pausedUntil) {
      moth.classList.add("moth-resting");
    } else {
      moth.classList.remove("moth-resting");
      var speed = now < boostUntil ? 190 : 24;
      var dx = targetX - x, dy = targetY - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) {
        pausedUntil = now + 3000 + Math.random() * 5000;
        pickTarget();
      } else {
        x += (dx / dist) * speed * dt;
        y += (dy / dist) * speed * dt;
        moth.style.transform = "scaleX(" + (dx < 0 ? -1 : 1) + ")";
      }
    }
    moth.style.left = x + "px";
    moth.style.top = y + "px";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
