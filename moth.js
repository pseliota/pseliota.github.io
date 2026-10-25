(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var webgpuActive = false;
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

  var mothCenter = reduced ? { x: window.innerWidth * 0.75, y: window.innerHeight * 0.25 } : { x: -80, y: window.innerHeight * 0.3 };
  var mothVel = { x: 20, y: 0 };
  var mothFlip = 1;
  var mothMovingUntil = performance.now() + 8000;
  var mothRestingUntil = 0;
  var mothResting = false;
  var mothBoostUntil = 0;

  function randnJS() {
    var u = Math.max(1e-9, Math.random());
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  var lastPointerRipple = 0;
  function rippleFromPointer(event, isMove) {
    if (!webgpuActive) { return; }
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
    var dx = px - mothCenter.x;
    var dy = py - mothCenter.y;
    if (!isMove && dx * dx + dy * dy < 100 * 100) {
      var angle = Math.random() * 2 * Math.PI;
      mothVel.x = Math.cos(angle) * 190;
      mothVel.y = Math.sin(angle) * 190;
      mothResting = false;
      mothBoostUntil = performance.now() + 1600;
      mothMovingUntil = performance.now() + 8000;
      return;
    }
    pendingDisturbs.push({ x: px, y: py, amp: 6, radius: 12 });
  }
  window.addEventListener("pointerdown", function (event) { rippleFromPointer(event, false); });
  window.addEventListener("pointermove", function (event) { rippleFromPointer(event, true); });
  window.addEventListener("touchstart", function (event) { rippleFromPointer(event, false); }, { passive: true });
  window.addEventListener("touchmove", function (event) { rippleFromPointer(event, true); }, { passive: true });

  function bezier(p0, c, p1, t) {
    var u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  }
  function sampleCurve(arr, p0, c, p1, n) {
    for (var i = 0; i < n; i++) {
      arr.push(bezier(p0, c, p1, i / (n - 1)));
    }
  }
  function sampleLine(arr, p0, p1, n) {
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      arr.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
    }
  }
  function buildAnchors() {
    var a = [];
    sampleCurve(a, { x: 0, y: -14 }, { x: -30, y: -30 }, { x: -70, y: -2 }, 60);
    sampleCurve(a, { x: -70, y: -2 }, { x: -45, y: 30 }, { x: 0, y: 14 }, 60);
    sampleCurve(a, { x: 0, y: -14 }, { x: 30, y: -30 }, { x: 70, y: -2 }, 60);
    sampleCurve(a, { x: 70, y: -2 }, { x: 45, y: 30 }, { x: 0, y: 14 }, 60);
    sampleCurve(a, { x: 0, y: 0 }, { x: -20, y: -6 }, { x: -42, y: 6 }, 30);
    sampleCurve(a, { x: 0, y: 0 }, { x: 20, y: -6 }, { x: 42, y: 6 }, 30);
    sampleLine(a, { x: 0, y: -18 }, { x: 0, y: 18 }, 40);
    sampleLine(a, { x: 0, y: -18 }, { x: -20, y: -36 }, 15);
    sampleLine(a, { x: 0, y: -18 }, { x: 20, y: -36 }, 15);
    return a;
  }

  function startPlainBackground() {
    document.body.style.background = "#faf6ee";
    window.__waterMode = "plain";
    function clearDisturbs() {
      pendingDisturbs.length = 0;
      requestAnimationFrame(clearDisturbs);
    }
    if (!reduced) {
      requestAnimationFrame(clearDisturbs);
    }
  }

  var waterComputeShader = [
    "struct Params { damping: f32, gridW: f32, gridH: f32, time: f32 }",
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

  var waterRenderShader = [
    "struct Params { damping: f32, gridW: f32, gridH: f32, time: f32 }",
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
    "  col = col + vec3<f32>(0.02 * sin(uv.y * 40.0 + sin(uv.x * 20.0) * 0.5));",
    "  col = clamp(col, vec3<f32>(0.0), vec3<f32>(1.0));",
    "  return vec4<f32>(col, 1.0);",
    "}"
  ].join("\n");

  var smokeComputeShader = [
    "struct SmokeParams { center: vec2<f32>, flip: f32, dt: f32, sigma: f32, k: f32, seed: f32, anchorCount: f32, viewport: vec2<f32>, pad: vec2<f32> }",
    "struct Particle { pos: vec2<f32>, size: f32, seed: f32 }",
    "@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;",
    "@group(0) @binding(1) var<storage, read> anchors: array<vec2<f32>>;",
    "@group(0) @binding(2) var<uniform> params: SmokeParams;",
    "fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }",
    "fn randn2(seed: f32, i: u32) -> vec2<f32> {",
    "  let u1 = max(hash(seed + f32(i) * 12.9898), 0.0001);",
    "  let u2 = hash(seed * 1.7 + f32(i) * 78.233);",
    "  let r = sqrt(-2.0 * log(u1));",
    "  let theta = 6.2831853 * u2;",
    "  return vec2<f32>(r * cos(theta), r * sin(theta));",
    "}",
    "@compute @workgroup_size(64)",
    "fn main(@builtin(global_invocation_id) id: vec3<u32>) {",
    "  let i = id.x;",
    "  if (i >= arrayLength(&particles)) { return; }",
    "  let anchorCount = u32(params.anchorCount);",
    "  let anchorIdx = i * anchorCount / arrayLength(&particles);",
    "  let anchor = anchors[anchorIdx];",
    "  let anchorWorld = params.center + vec2<f32>(anchor.x * params.flip, anchor.y);",
    "  var p = particles[i];",
    "  let drift = -params.k * (p.pos - anchorWorld);",
    "  p.pos = p.pos + drift * params.dt + params.sigma * sqrt(params.dt) * randn2(params.seed, i);",
    "  particles[i] = p;",
    "}"
  ].join("\n");

  var smokeRenderShader = [
    "struct SmokeParams { center: vec2<f32>, flip: f32, dt: f32, sigma: f32, k: f32, seed: f32, anchorCount: f32, viewport: vec2<f32>, pad: vec2<f32> }",
    "struct Particle { pos: vec2<f32>, size: f32, seed: f32 }",
    "struct VSOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) alpha: f32 }",
    "@group(0) @binding(0) var<storage, read> particles: array<Particle>;",
    "@group(0) @binding(1) var<uniform> params: SmokeParams;",
    "@vertex",
    "fn vs(@builtin(vertex_index) v: u32, @builtin(instance_index) inst: u32) -> VSOut {",
    "  var corners = array<vec2<f32>, 6>(vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0));",
    "  let p = particles[inst];",
    "  let corner = corners[v];",
    "  let world = p.pos + corner * p.size * 0.5;",
    "  var out: VSOut;",
    "  out.pos = vec4<f32>(world.x / params.viewport.x * 2.0 - 1.0, 1.0 - world.y / params.viewport.y * 2.0, 0.0, 1.0);",
    "  out.uv = corner * 0.5 + vec2<f32>(0.5, 0.5);",
    "  out.alpha = 0.12 + fract(p.seed * 0.37) * 0.16;",
    "  return out;",
    "}",
    "@fragment",
    "fn fs(@location(0) uv: vec2<f32>, @location(1) alpha: f32) -> @location(0) vec4<f32> {",
    "  let dist = length(uv - vec2<f32>(0.5, 0.5)) * 2.0;",
    "  let a = smoothstep(1.0, 0.1, dist) * alpha;",
    "  return vec4<f32>(0.78, 0.72, 0.58, a);",
    "}"
  ].join("\n");

  async function startWebGPU() {
    if (!navigator.gpu) { return false; }
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { return false; }
    var device = await adapter.requestDevice();

    var waterCanvas = document.createElement("canvas");
    waterCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    background.insertBefore(waterCanvas, sky);
    var waterContext = waterCanvas.getContext("webgpu");
    var format = navigator.gpu.getPreferredCanvasFormat();
    waterContext.configure({ device: device, format: format, alphaMode: "opaque" });
    function resizeWaterCanvas() {
      waterCanvas.width = window.innerWidth;
      waterCanvas.height = window.innerHeight;
    }
    resizeWaterCanvas();
    window.addEventListener("resize", resizeWaterCanvas);
    window.addEventListener("scroll", resizeWaterCanvas, { passive: true });
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", resizeWaterCanvas); }

    var smokeCanvas = document.createElement("canvas");
    smokeCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:10;pointer-events:none;";
    background.appendChild(smokeCanvas);
    var smokeContext = smokeCanvas.getContext("webgpu");
    smokeContext.configure({ device: device, format: format, alphaMode: "premultiplied" });
    function resizeSmokeCanvas() {
      smokeCanvas.width = window.innerWidth;
      smokeCanvas.height = window.innerHeight;
    }
    resizeSmokeCanvas();
    window.addEventListener("resize", resizeSmokeCanvas);
    window.addEventListener("scroll", resizeSmokeCanvas, { passive: true });
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", resizeSmokeCanvas); }

    var gridW = 256;
    var gridH = Math.max(128, Math.min(384, Math.round(256 * window.innerHeight / window.innerWidth)));
    var cellCount = gridW * gridH;
    var bufferA = device.createBuffer({ size: cellCount * 4, usage: GPUBufferUsage.STORAGE });
    var bufferB = device.createBuffer({ size: cellCount * 4, usage: GPUBufferUsage.STORAGE });
    var waterParamsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(waterParamsBuffer, 0, new Float32Array([0.97, gridW, gridH, 0]));
    var disturbsBuffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    var anchors = buildAnchors();
    var anchorCount = anchors.length;
    var anchorData = new Float32Array(anchorCount * 2);
    for (var ai = 0; ai < anchorCount; ai++) {
      anchorData[ai * 2] = anchors[ai].x;
      anchorData[ai * 2 + 1] = anchors[ai].y;
    }
    var anchorBuffer = device.createBuffer({ size: anchorData.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(anchorBuffer, 0, anchorData);

    var particleCount = 2200;
    var particleData = new Float32Array(particleCount * 4);
    for (var pi = 0; pi < particleCount; pi++) {
      var anchor = anchors[Math.floor(pi * anchorCount / particleCount)];
      particleData[pi * 4] = mothCenter.x + anchor.x + randnJS() * 6;
      particleData[pi * 4 + 1] = mothCenter.y + anchor.y + randnJS() * 6;
      particleData[pi * 4 + 2] = 8 + Math.random() * 8;
      particleData[pi * 4 + 3] = Math.random() * 1000;
    }
    var particleBuffer = device.createBuffer({ size: particleData.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(particleBuffer, 0, particleData);
    var smokeParamsBuffer = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    var waterComputeModule = device.createShaderModule({ code: waterComputeShader });
    var waterRenderModule = device.createShaderModule({ code: waterRenderShader });
    var smokeComputeModule = device.createShaderModule({ code: smokeComputeShader });
    var smokeRenderModule = device.createShaderModule({ code: smokeRenderShader });
    var infos = await Promise.all([
      waterComputeModule.getCompilationInfo(),
      waterRenderModule.getCompilationInfo(),
      smokeComputeModule.getCompilationInfo(),
      smokeRenderModule.getCompilationInfo()
    ]);
    for (var ii = 0; ii < infos.length; ii++) {
      if (infos[ii].messages.some(function (m) { return m.type === "error"; })) { throw new Error("shader compilation failed"); }
    }

    var waterComputePipeline = device.createComputePipeline({ layout: "auto", compute: { module: waterComputeModule, entryPoint: "main" } });
    var waterRenderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: waterRenderModule, entryPoint: "vs" },
      fragment: { module: waterRenderModule, entryPoint: "fs", targets: [{ format: format }] },
      primitive: { topology: "triangle-list" }
    });
    var smokeComputePipeline = device.createComputePipeline({ layout: "auto", compute: { module: smokeComputeModule, entryPoint: "main" } });
    var smokeRenderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: smokeRenderModule, entryPoint: "vs" },
      fragment: { module: smokeRenderModule, entryPoint: "fs", targets: [{ format: format, blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } } }] },
      primitive: { topology: "triangle-list" }
    });

    var waterComputeGroupA = device.createBindGroup({ layout: waterComputePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: waterParamsBuffer } },
      { binding: 3, resource: { buffer: disturbsBuffer } }
    ]});
    var waterComputeGroupB = device.createBindGroup({ layout: waterComputePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: bufferA } },
      { binding: 2, resource: { buffer: waterParamsBuffer } },
      { binding: 3, resource: { buffer: disturbsBuffer } }
    ]});
    var waterRenderGroupA = device.createBindGroup({ layout: waterRenderPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: waterParamsBuffer } }
    ]});
    var waterRenderGroupB = device.createBindGroup({ layout: waterRenderPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: bufferB } },
      { binding: 1, resource: { buffer: waterParamsBuffer } }
    ]});
    var smokeComputeGroup = device.createBindGroup({ layout: smokeComputePipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: particleBuffer } },
      { binding: 1, resource: { buffer: anchorBuffer } },
      { binding: 2, resource: { buffer: smokeParamsBuffer } }
    ]});
    var smokeRenderGroup = device.createBindGroup({ layout: smokeRenderPipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: particleBuffer } },
      { binding: 1, resource: { buffer: smokeParamsBuffer } }
    ]});

    webgpuActive = true;
    window.__waterMode = "webgpu";

    if (reduced) {
      var encoder0 = device.createCommandEncoder();
      var waterPass0 = encoder0.beginRenderPass({ colorAttachments: [{ view: waterContext.getCurrentTexture().createView(), loadOp: "clear", clearValue: { r: 0.98, g: 0.96, b: 0.93, a: 1 }, storeOp: "store" }] });
      waterPass0.setPipeline(waterRenderPipeline);
      waterPass0.setBindGroup(0, waterRenderGroupA);
      waterPass0.draw(3);
      waterPass0.end();
      var smokeParams0 = new Float32Array(12);
      smokeParams0[0] = mothCenter.x; smokeParams0[1] = mothCenter.y; smokeParams0[2] = 1; smokeParams0[3] = 0;
      smokeParams0[4] = 18; smokeParams0[5] = 0.8; smokeParams0[6] = 0; smokeParams0[7] = anchorCount;
      smokeParams0[8] = window.innerWidth; smokeParams0[9] = window.innerHeight;
      device.queue.writeBuffer(smokeParamsBuffer, 0, smokeParams0);
      var smokePass0 = encoder0.beginRenderPass({ colorAttachments: [{ view: smokeContext.getCurrentTexture().createView(), loadOp: "clear", clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: "store" }] });
      smokePass0.setPipeline(smokeRenderPipeline);
      smokePass0.setBindGroup(0, smokeRenderGroup);
      smokePass0.draw(6, particleCount);
      smokePass0.end();
      device.queue.submit([encoder0.finish()]);
      return true;
    }

    var useA = true;
    var last = performance.now();
    var seed = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      seed += dt * 10;
      if (mothResting && now >= mothRestingUntil) {
        mothResting = false;
        mothMovingUntil = now + 5000 + Math.random() * 7000;
        var kick = Math.random() * 2 * Math.PI;
        mothVel.x = Math.cos(kick) * 15;
        mothVel.y = Math.sin(kick) * 15;
      }
      if (!mothResting && now > mothMovingUntil) {
        mothResting = true;
        mothRestingUntil = now + 3000 + Math.random() * 5000;
      }
      if (mothResting) {
        var settle = Math.exp(-3 * dt);
        mothVel.x *= settle;
        mothVel.y *= settle;
      } else {
        var sigma = 35;
        var kickScale = sigma * Math.sqrt(dt);
        mothVel.x += randnJS() * kickScale;
        mothVel.y += randnJS() * kickScale;
        var damp = Math.exp(-0.9 * dt);
        mothVel.x *= damp;
        mothVel.y *= damp;
        var speed = Math.sqrt(mothVel.x * mothVel.x + mothVel.y * mothVel.y);
        var maxSpeed = now < mothBoostUntil ? 200 : 60;
        if (speed > maxSpeed) {
          mothVel.x = (mothVel.x / speed) * maxSpeed;
          mothVel.y = (mothVel.y / speed) * maxSpeed;
        }
        if (Math.abs(mothVel.x) > 5) {
          mothFlip = mothVel.x < 0 ? -1 : 1;
        }
      }
      mothCenter.x += mothVel.x * dt;
      mothCenter.y += mothVel.y * dt;
      var margin = 20;
      if (mothCenter.x < margin) { mothCenter.x = margin; mothVel.x = Math.abs(mothVel.x); }
      if (mothCenter.x > window.innerWidth - 70) { mothCenter.x = window.innerWidth - 70; mothVel.x = -Math.abs(mothVel.x); }
      if (mothCenter.y < margin) { mothCenter.y = margin; mothVel.y = Math.abs(mothVel.y); }
      if (mothCenter.y > window.innerHeight - 60) { mothCenter.y = window.innerHeight - 60; mothVel.y = -Math.abs(mothVel.y); }

      var disturbs = new Float32Array(16);
      for (var i = 0; i < 4 && pendingDisturbs.length > 0; i++) {
        var d = pendingDisturbs.shift();
        disturbs[i * 4] = d.x / window.innerWidth * gridW;
        disturbs[i * 4 + 1] = (window.innerHeight - d.y) / window.innerHeight * gridH;
        disturbs[i * 4 + 2] = d.amp;
        disturbs[i * 4 + 3] = d.radius;
      }
      pendingDisturbs.length = 0;
      device.queue.writeBuffer(disturbsBuffer, 0, disturbs);

      var smokeParams = new Float32Array(12);
      smokeParams[0] = mothCenter.x; smokeParams[1] = mothCenter.y; smokeParams[2] = mothFlip; smokeParams[3] = dt;
      smokeParams[4] = 18; smokeParams[5] = 0.8; smokeParams[6] = seed; smokeParams[7] = anchorCount;
      smokeParams[8] = window.innerWidth; smokeParams[9] = window.innerHeight;
      device.queue.writeBuffer(smokeParamsBuffer, 0, smokeParams);

      var encoder = device.createCommandEncoder();
      var waterComputePass = encoder.beginComputePass();
      waterComputePass.setPipeline(waterComputePipeline);
      waterComputePass.setBindGroup(0, useA ? waterComputeGroupA : waterComputeGroupB);
      waterComputePass.dispatchWorkgroups(Math.ceil(gridW / 16), Math.ceil(gridH / 16));
      waterComputePass.end();
      useA = !useA;
      var waterPass = encoder.beginRenderPass({ colorAttachments: [{ view: waterContext.getCurrentTexture().createView(), loadOp: "clear", clearValue: { r: 0.98, g: 0.96, b: 0.93, a: 1 }, storeOp: "store" }] });
      waterPass.setPipeline(waterRenderPipeline);
      waterPass.setBindGroup(0, useA ? waterRenderGroupA : waterRenderGroupB);
      waterPass.draw(3);
      waterPass.end();
      var smokeComputePass = encoder.beginComputePass();
      smokeComputePass.setPipeline(smokeComputePipeline);
      smokeComputePass.setBindGroup(0, smokeComputeGroup);
      smokeComputePass.dispatchWorkgroups(Math.ceil(particleCount / 64));
      smokeComputePass.end();
      var smokePass = encoder.beginRenderPass({ colorAttachments: [{ view: smokeContext.getCurrentTexture().createView(), loadOp: "clear", clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: "store" }] });
      smokePass.setPipeline(smokeRenderPipeline);
      smokePass.setBindGroup(0, smokeRenderGroup);
      smokePass.draw(6, particleCount);
      smokePass.end();
      device.queue.submit([encoder.finish()]);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  }

  startWebGPU().then(function (ok) {
    if (!ok) { startPlainBackground(); }
  }).catch(function () {
    startPlainBackground();
  });
})();
