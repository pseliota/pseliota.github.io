(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pendingDisturbs = [];

  var background = document.createElement("div");
  background.setAttribute("aria-hidden", "true");
  background.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;z-index:1;overflow:hidden;pointer-events:none;transform:translateZ(0);will-change:transform;";
  document.body.appendChild(background);

  var sky = document.createElement("div");
  sky.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  background.appendChild(sky);

  if (!reduced) {
    for (var i = 0; i < 24; i++) {
      var dot = document.createElement("span");
      var size = 2 + Math.random() * 2;
      dot.style.cssText = "position:absolute;border-radius:50%;background:#b8ad9c;opacity:0.2;width:" + size + "px;height:" + size + "px;left:" + (Math.random() * 100) + "%;top:" + (Math.random() * 100) + "%;animation:twinkle " + (4 + Math.random() * 5) + "s ease-in-out " + (Math.random() * 5) + "s infinite alternate;";
      sky.appendChild(dot);
    }
    var twinkleStyle = document.createElement("style");
    twinkleStyle.textContent = "@keyframes twinkle{from{opacity:0.08}to{opacity:0.35}}";
    document.head.appendChild(twinkleStyle);
  }

  var smokeLayer = document.createElement("div");
  smokeLayer.style.cssText = "position:absolute;inset:0;overflow:hidden;z-index:9;pointer-events:none;";
  background.appendChild(smokeLayer);

  var moth = document.createElement("div");
  moth.title = "A doily wave moth, passing through.";
  moth.style.cssText = "position:absolute;width:46px;height:32px;z-index:10;cursor:pointer;pointer-events:auto;opacity:0.8;filter:blur(0.6px);";
  moth.innerHTML = '<svg viewBox="0 0 64 40" width="46" height="32"><g class="wing-left"><path d="M32 20 C22 4 6 2 7 15 C8 27 20 28 32 22 Z" fill="#e9dfc9" fill-opacity="0.55" stroke="#6b6257" stroke-opacity="0.7" stroke-width="1"/></g><g class="wing-right"><path d="M32 20 C42 4 58 2 57 15 C56 27 44 28 32 22 Z" fill="#e9dfc9" fill-opacity="0.55" stroke="#6b6257" stroke-opacity="0.7" stroke-width="1"/></g><ellipse cx="32" cy="20" rx="2.5" ry="10" fill="#6b6257" fill-opacity="0.6"/><path d="M30 11 C27 6 25 5 23 4 M34 11 C37 6 39 5 41 4" fill="none" stroke="#6b6257" stroke-opacity="0.6" stroke-width="1"/></svg>';
  background.appendChild(moth);

  var wingStyle = document.createElement("style");
  wingStyle.textContent = ".wing-left{transform-box:fill-box;transform-origin:right center;animation:flap 0.7s ease-in-out infinite alternate}.wing-right{transform-box:fill-box;transform-origin:left center;animation:flap 0.7s ease-in-out infinite alternate}@keyframes flap{from{transform:scaleX(0.7)}to{transform:scaleX(1)}}.moth-resting .wing-left,.moth-resting .wing-right{animation-duration:2s}@keyframes puff{from{opacity:0.4;transform:scale(0.6)}to{opacity:0;transform:scale(1.7) translateY(-8px)}}";
  document.head.appendChild(wingStyle);

  var lastPointerRipple = 0;
  function rippleFromPointer(event, isMove) {
    var now = performance.now();
    if (isMove) {
      var isTouch = (event.touches && event.touches.length > 0) || event.pointerType === "touch";
      if (!isTouch && event.buttons === 0) { return; }
      if (now - lastPointerRipple < 60) { return; }
    }
    lastPointerRipple = now;
    var touch = event.touches && event.touches[0];
    var px = touch ? touch.clientX : event.clientX;
    var py = touch ? touch.clientY : event.clientY;
    pendingDisturbs.push({ x: px, y: py, amp: 6, radius: 12 });
  }
  window.addEventListener("pointerdown", function (event) { rippleFromPointer(event, false); });
  window.addEventListener("pointermove", function (event) { rippleFromPointer(event, true); });
  window.addEventListener("touchstart", function (event) { rippleFromPointer(event, false); }, { passive: true });
  window.addEventListener("touchmove", function (event) { rippleFromPointer(event, true); }, { passive: true });

  function startCanvasWater() {
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    background.insertBefore(canvas, sky);
    var ctx = canvas.getContext("2d");
    function resize() {
      var dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", resize, { passive: true });
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", resize); }
    var ripples = [];
    var lastWater = performance.now();
    var nextRandom = lastWater + 2500;
    function drawWater(t) {
      var w = window.innerWidth, h = window.innerHeight;
      var gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#f3ead6");
      gradient.addColorStop(0.55, "#f7f1e2");
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
        ctx.fillStyle = "rgba(216, 203, 176, " + (wave.alpha * 0.5) + ")";
        ctx.fill();
        ctx.beginPath();
        for (var x2 = 0; x2 <= w; x2 += 10) {
          var y2 = h * wave.base + Math.sin(x2 * 0.008 + t * wave.speed + wave.phase) * wave.amp + Math.sin(x2 * 0.02 - t * wave.speed * 0.7) * wave.amp * 0.4;
          if (x2 === 0) { ctx.moveTo(x2, y2); } else { ctx.lineTo(x2, y2); }
        }
        ctx.strokeStyle = "rgba(184, 173, 156, " + wave.alpha + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (var j = ripples.length - 1; j >= 0; j--) {
        var ripple = ripples[j];
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(150, 138, 115, " + ripple.alpha + ")";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    function waterFrame(now) {
      var dt = Math.min(0.05, (now - lastWater) / 1000);
      lastWater = now;
      if (now >= nextRandom) {
        pendingDisturbs.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, amp: 2, radius: 10 });
        nextRandom = now + 2500 + Math.random() * 2500;
      }
      while (pendingDisturbs.length > 0) {
        var d = pendingDisturbs.shift();
        ripples.push({ x: d.x, y: d.y, r: 6, alpha: Math.min(0.42, d.amp * 0.07) });
      }
      for (var i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 28 * dt;
        ripples[i].alpha -= 0.5 * dt;
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
  }

  var computeShader = [
    "struct Params { damping: f32, gridW: f32, gridH: f32, pad: f32 }",
    "struct Disturb { pos: vec2<f32>, amp: f32, radius: f32 }",
    "struct Disturbs { items: array<Disturb, 4> }",
    "@group(0) @binding(0) var<storage, read> cur: array<f32>;",
    "@group(0) @binding(1) var<storage, read_write> outBuf: array<f32>;",
    "@group(0) @binding(2) var<uniform> params: Params;",
    "@group(0) @binding(3) var<uniform> disturbs: Disturbs;",
    "@compute @workgroup_size(16, 16)",
    "fn main(@builtin(global_invocation_id) id: vec3<u32>) {",
    "  let w = u32(params.gridW);",
    "  let h = u32(params.gridH);",
    "  if (id.x >= w || id.y >= h) { return; }",
    "  let idx = id.y * w + id.x;",
    "  let xm = select(id.x - 1u, 0u, id.x == 0u);",
    "  let xp = select(id.x + 1u, w - 1u, id.x == w - 1u);",
    "  let ym = select(id.y - 1u, 0u, id.y == 0u);",
    "  let yp = select(id.y + 1u, h - 1u, id.y == h - 1u);",
    "  let left = cur[id.y * w + xm];",
    "  let right = cur[id.y * w + xp];",
    "  let up = cur[ym * w + id.x];",
    "  let down = cur[yp * w + id.x];",
    "  var v = (left + right + up + down) * 0.5 - outBuf[idx];",
    "  v = v * params.damping;",
    "  for (var i = 0; i < 4; i = i + 1) {",
    "    let d = disturbs.items[i];",
    "    if (d.amp != 0.0) {",
    "      let dist = distance(vec2<f32>(f32(id.x), f32(id.y)), d.pos);",
    "      if (dist < d.radius) {",
    "        v = v + d.amp * exp(-dist * dist / (d.radius * d.radius * 0.25));",
    "      }",
    "    }",
    "  }",
    "  outBuf[idx] = v;",
    "}"
  ].join("\n");

  var renderShader = [
    "struct Params { damping: f32, gridW: f32, gridH: f32, pad: f32 }",
    "struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }",
    "@vertex",
    "fn vs(@builtin(vertex_index) i: u32) -> VSOut {",
    "  var positions = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));",
    "  var out: VSOut;",
    "  out.pos = vec4<f32>(positions[i], 0.0, 1.0);",
    "  out.uv = positions[i] * 0.5 + vec2<f32>(0.5, 0.5);",
    "  return out;",
    "}",
    "@group(0) @binding(0) var<storage, read> heights: array<f32>;",
    "@group(0) @binding(1) var<uniform> params: Params;",
    "@fragment",
    "fn fs(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {",
    "  let w = u32(params.gridW);",
    "  let h = u32(params.gridH);",
    "  let gx = min(u32(uv.x * params.gridW), w - 1u);",
    "  let gy = min(u32(uv.y * params.gridH), h - 1u);",
    "  let idx = gy * w + gx;",
    "  let xm = select(gx - 1u, 0u, gx == 0u);",
    "  let xp = select(gx + 1u, w - 1u, gx == w - 1u);",
    "  let ym = select(gy - 1u, 0u, gy == 0u);",
    "  let yp = select(gy + 1u, h - 1u, gy == h - 1u);",
    "  let dx = heights[gy * w + xp] - heights[gy * w + xm];",
    "  let dy = heights[yp * w + gx] - heights[ym * w + gx];",
    "  let n = normalize(vec3<f32>(-dx * 0.35, -dy * 0.35, 1.0));",
    "  let light = normalize(vec3<f32>(0.5, 0.8, 0.7));",
    "  let diffuse = clamp(dot(n, light), 0.0, 1.0);",
    "  let cream = vec3<f32>(0.98, 0.96, 0.93);",
    "  let shade = vec3<f32>(0.82, 0.77, 0.65);",
    "  var col = mix(shade, cream, diffuse);",
    "  col = col + heights[idx] * 0.015;",
    "  col = clamp(col, vec3<f32>(0.0), vec3<f32>(1.0));",
    "  return vec4<f32>(col, 1.0);",
    "}"
  ].join("\n");

  async function startWebGPU() {
    if (!navigator.gpu) { return false; }
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { return false; }
    var device = await adapter.requestDevice();
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    background.insertBefore(canvas, sky);
    var context = canvas.getContext("webgpu");
    var format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device: device, format: format, alphaMode: "opaque" });
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("scroll", resizeCanvas, { passive: true });
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", resizeCanvas); }
    var gridW = 256;
    var gridH = Math.max(128, Math.min(384, Math.round(256 * window.innerHeight / window.innerWidth)));
    var cellCount = gridW * gridH;
    var bufferA = device.createBuffer({ size: cellCount * 4, usage: GPUBufferUsage.STORAGE });
    var bufferB = device.createBuffer({ size: cellCount * 4, usage: GPUBufferUsage.STORAGE });
    var paramsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([0.97, gridW, gridH, 0]));
    var disturbsBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    var computeModule = device.createShaderModule({ code: computeShader });
    var renderModule = device.createShaderModule({ code: renderShader });
    var computeInfo = await computeModule.getCompilationInfo();
    var renderInfo = await renderModule.getCompilationInfo();
    if (computeInfo.messages.some(function (m) { return m.type === "error"; }) || renderInfo.messages.some(function (m) { return m.type === "error"; })) {
      throw new Error("shader compilation failed");
    }
    var computePipeline = device.createComputePipeline({ layout: "auto", compute: { module: computeModule, entryPoint: "main" } });
    var renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: renderModule, entryPoint: "vs" },
      fragment: { module: renderModule, entryPoint: "fs", targets: [{ format: format }] },
      primitive: { topology: "triangle-list" }
    });
    var computeGroupA = device.createBindGroup({ layout: computePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: paramsBuffer } },
      { binding: 3, resource: { buffer: disturbsBuffer } }
    ]});
    var computeGroupB = device.createBindGroup({ layout: computePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: paramsBuffer } },
      { binding: 3, resource: { buffer: disturbsBuffer } }
    ]});
    var renderGroupA = device.createBindGroup({ layout: renderPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: paramsBuffer } }
    ]});
    var renderGroupB = device.createBindGroup({ layout: renderPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: paramsBuffer } }
    ]});
    var useA = true;
    var nextRandom = performance.now() + 2500;
    function webgpuFrame(now) {
      if (now >= nextRandom) {
        pendingDisturbs.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, amp: 2, radius: 10 });
        nextRandom = now + 2500 + Math.random() * 2500;
      }
      var disturbs = new Float32Array(16);
      for (var i = 0; i < 4 && pendingDisturbs.length > 0; i++) {
        var d = pendingDisturbs.shift();
        disturbs[i * 4] = d.x / window.innerWidth * gridW;
        disturbs[i * 4 + 1] = d.y / window.innerHeight * gridH;
        disturbs[i * 4 + 2] = d.amp;
        disturbs[i * 4 + 3] = d.radius;
      }
      pendingDisturbs.length = 0;
      device.queue.writeBuffer(disturbsBuffer, 0, disturbs);
      var encoder = device.createCommandEncoder();
      var computePass = encoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, useA ? computeGroupA : computeGroupB);
      computePass.dispatchWorkgroups(Math.ceil(gridW / 16), Math.ceil(gridH / 16));
      computePass.end();
      useA = !useA;
      var textureView = context.getCurrentTexture().createView();
      var renderPass = encoder.beginRenderPass({ colorAttachments: [{ view: textureView, loadOp: "clear", clearValue: { r: 0.98, g: 0.96, b: 0.93, a: 1 }, storeOp: "store" }] });
      renderPass.setPipeline(renderPipeline);
      renderPass.setBindGroup(0, useA ? renderGroupA : renderGroupB);
      renderPass.draw(3);
      renderPass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(webgpuFrame);
    }
    if (reduced) {
      var encoder0 = device.createCommandEncoder();
      var renderPass0 = encoder0.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: "clear", clearValue: { r: 0.98, g: 0.96, b: 0.93, a: 1 }, storeOp: "store" }] });
      renderPass0.setPipeline(renderPipeline);
      renderPass0.setBindGroup(0, renderGroupA);
      renderPass0.draw(3);
      renderPass0.end();
      device.queue.submit([encoder0.finish()]);
    } else {
      requestAnimationFrame(webgpuFrame);
    }
    window.__waterMode = "webgpu";
    return true;
  }

  startWebGPU().then(function (ok) {
    if (!ok) { startCanvasWater(); }
  }).catch(function () {
    startCanvasWater();
  });

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
  var nextPuff = 0;

  function randn() {
    var u = Math.max(1e-9, Math.random());
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  moth.addEventListener("pointerdown", function () {
    var angle = Math.random() * 2 * Math.PI;
    vx = Math.cos(angle) * 190;
    vy = Math.sin(angle) * 190;
    resting = false;
    boostUntil = performance.now() + 1600;
    movingUntil = performance.now() + 8000;
  });

  function spawnPuff(cx, cy) {
    var puff = document.createElement("span");
    var size = 20 + Math.random() * 14;
    puff.style.cssText = "position:absolute;border-radius:50%;background:radial-gradient(circle, rgba(232, 221, 200, 0.55), rgba(232, 221, 200, 0) 70%);filter:blur(4px);width:" + size + "px;height:" + size + "px;left:" + (cx - size / 2) + "px;top:" + (cy - size / 2) + "px;animation:puff 1.8s ease-out forwards;pointer-events:none;";
    smokeLayer.appendChild(puff);
    setTimeout(function () { if (puff.parentNode) { puff.parentNode.removeChild(puff); } }, 1900);
  }

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
      if (speed > 10) {
        pendingDisturbs.push({ x: x + 23, y: y + 16, amp: speed * 0.03, radius: 8 });
        if (now >= nextPuff) {
          spawnPuff(x + 23, y + 16);
          nextPuff = now + 140;
        }
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
