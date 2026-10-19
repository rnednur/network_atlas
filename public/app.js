const canvas = document.querySelector("#graph");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);

const state = {
  nodes: [], edges: [], byId: new Map(), health: new Map(), enabledEdges: new Set(),
  view: "atlas", selected: null, focusRoot: null, investigationData: null,
  direction: "downstream", zoom: 1, orbit: 0, tilt: 0, drag: null
};

const layerColor = { Core: "#ffb65c", Transport: "#51ddc6", RAN: "#6e9dff" };
const edgeColor = { PHYSICAL: "#4b7187", CARRIES: "#45baa8", CONTROLS: "#a77bca", DEPENDS_ON: "#6387dc", BACKUP: "#687388" };
const groupOrder = [
  { key: "Core", label: "Core network", types: ["AMF", "SMF", "UPF"] },
  { key: "PE", label: "Provider edge", types: ["PE"] },
  { key: "AGG", label: "Aggregation", types: ["AGG"] },
  { key: "GNB", label: "RAN / gNB", types: ["GNB"] },
  { key: "CELL", label: "Cells", types: ["CELL"] }
];

async function load() {
  const current = await fetch("/bundles/current.json").then((response) => response.json());
  const base = `/bundles/${current.version}/`;
  const manifest = await fetch(`${base}manifest.json`).then((response) => response.json());
  const [metadata, positions, edgeBinary] = await Promise.all([
    fetch(`${base}metadata.json`).then((response) => response.json()),
    fetch(`${base}positions.bin`).then((response) => response.arrayBuffer()),
    fetch(`${base}edges.bin`).then((response) => response.arrayBuffer())
  ]);

  state.nodes = metadata.nodes;
  state.edges = metadata.edges;
  state.nodes.forEach((node, index) => {
    node.index = index;
    node.position = readPosition(positions, index);
    state.byId.set(node.id, node);
  });
  validateEdges(edgeBinary, state.edges.length);
  Object.keys(manifest.typeCodes.edges).forEach((type) => state.enabledEdges.add(type));
  buildFilters(manifest.typeCodes.edges);
  $("#bundleVersion").textContent = current.version;
  $("#bundleSize").textContent = `${formatBytes(Object.values(manifest.files).reduce((sum, file) => sum + file.bytes, 0))} bundle`;
  $("#counts").textContent = `${manifest.nodeCount.toLocaleString()} elements · ${manifest.edgeCount.toLocaleString()} typed relationships`;
  $("#liveLabel").textContent = "Live synthetic health";
  connectHealth();
  resize();
  requestAnimationFrame(drawAtlas);
}

function readPosition(buffer, index) {
  const view = new DataView(buffer);
  if (String.fromCharCode(...new Uint8Array(buffer, 0, 4)) !== "NPOS") throw new Error("Invalid positions bundle");
  const offset = 16 + index * 12;
  return { x: view.getFloat32(offset, true), y: view.getFloat32(offset + 4, true), z: view.getFloat32(offset + 8, true) };
}

function validateEdges(buffer, count) {
  const view = new DataView(buffer);
  if (String.fromCharCode(...new Uint8Array(buffer, 0, 4)) !== "NEDG" || view.getUint32(8, true) !== count) throw new Error("Invalid edges bundle");
}

function buildFilters(types) {
  const root = $("#edgeFilters");
  Object.keys(types).forEach((type) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" checked value="${type}"><span style="color:${edgeColor[type]}">━</span>${type.replace("_", " ")}`;
    label.querySelector("input").addEventListener("change", (event) => {
      event.target.checked ? state.enabledEdges.add(type) : state.enabledEdges.delete(type);
      drawAtlas();
      drawDependencyEdges();
    });
    root.append(label);
  });
}

function connectHealth() {
  const stream = new EventSource("/api/health/stream");
  stream.addEventListener("health", (event) => {
    JSON.parse(event.data).updates.forEach((update) => state.health.set(update.id, update));
    if (state.selected) showDetails(state.selected);
    drawAtlas();
    refreshDependencyHealth();
  });
  stream.onerror = () => { $("#liveLabel").textContent = "Health stream reconnecting…"; };
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  const density = devicePixelRatio || 1;
  canvas.width = bounds.width * density;
  canvas.height = bounds.height * density;
  ctx.setTransform(density, 0, 0, density, 0, 0);
  drawAtlas();
  drawDependencyEdges();
}

function atlasPoint(node, width, height) {
  const { y, z } = node.position;
  const cosine = Math.cos(state.orbit);
  const sine = Math.sin(state.orbit);
  const horizontal = y * cosine - z * sine;
  const depth = y * sine + z * cosine;
  const scale = (Math.min(width * .82, 1380) / 330) * state.zoom;
  const x = width / 2 + horizontal * scale;
  const baselines = node.type === "CELL" ? .79 : node.type === "GNB" ? .64 : node.type === "AGG" ? .45 : node.type === "PE" ? .33 : .19;
  const arch = Math.pow(Math.min(Math.abs(x - width / 2) / (width * .48), 1), 1.7) * height * (node.layer === "Core" ? .025 : node.layer === "Transport" ? .065 : .11);
  const verticalDepth = depth * (.11 + state.tilt * .08) * state.zoom;
  return { x, y: height * baselines + arch + verticalDepth, depth };
}

function activeEdges() { return state.edges.filter((edge) => state.enabledEdges.has(edge.type)); }
function isConnected(id) { return state.edges.some((edge) => state.enabledEdges.has(edge.type) && ((edge.source === state.selected?.id && edge.target === id) || (edge.target === state.selected?.id && edge.source === id))); }

function drawAtlas() {
  if (!canvas.width || state.view !== "atlas") return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  const points = new Map(state.nodes.map((node) => [node.id, atlasPoint(node, width, height)]));

  for (const edge of activeEdges()) {
    const from = points.get(edge.source);
    const to = points.get(edge.target);
    if (!from || !to) continue;
    const highlighted = state.selected && (edge.source === state.selected.id || edge.target === state.selected.id);
    ctx.globalAlpha = highlighted ? .72 : .115;
    ctx.strokeStyle = highlighted ? "#b8d3ff" : edgeColor[edge.type];
    ctx.lineWidth = highlighted ? 1.25 : .55;
    ctx.setLineDash(edge.type === "BACKUP" ? [4, 5] : []);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const controlY = Math.min(from.y, to.y) + Math.abs(to.y - from.y) * .42;
    ctx.quadraticCurveTo((from.x + to.x) / 2, controlY, to.x, to.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const nodes = [...state.nodes].sort((a, b) => points.get(a.id).depth - points.get(b.id).depth);
  for (const node of nodes) {
    const point = points.get(node.id);
    const health = nodeHealth(node);
    const selected = node === state.selected;
    const color = health === "critical" ? "#ff4f7b" : health === "degraded" ? "#ffbd66" : layerColor[node.layer];
    const baseRadius = node.type === "CELL" ? 2.15 : node.type === "GNB" ? 3.1 : node.type === "AGG" ? 4.4 : node.type === "PE" ? 5.2 : 6;
    const radius = (selected ? baseRadius + 3 : baseRadius) * Math.max(.75, state.zoom);
    ctx.globalAlpha = state.selected && !selected && !isConnected(node.id) ? .23 : .98;
    ctx.shadowBlur = selected ? 22 : health === "healthy" ? 7 : 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (selected) {
      ctx.strokeStyle = "#f4f8ff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function findNodeAt(x, y) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  let found = null;
  let distance = 14;
  for (const node of state.nodes) {
    const point = atlasPoint(node, width, height);
    const candidate = Math.hypot(x - point.x, y - point.y);
    if (candidate < distance) { found = node; distance = candidate; }
  }
  return found;
}

function selectNode(node) {
  state.selected = node;
  showDetails(node);
  drawAtlas();
}

function clearSelection() {
  state.selected = null;
  $("#detailsCard").hidden = true;
  drawAtlas();
}

function showDetails(node) {
  $("#detailsCard").hidden = false;
  $("#nodeType").textContent = `${node.layer} · ${node.type}`;
  $("#nodeName").textContent = node.name;
  $("#nodeId").textContent = node.id;
  const health = state.health.get(node.id) || { health: node.health };
  const badge = $("#healthBadge");
  badge.className = `health-badge ${health.health}`;
  badge.textContent = health.health;
  $("#metrics").innerHTML = `<dt>Market</dt><dd>${node.market}</dd><dt>Criticality</dt><dd>${Math.round(node.criticality * 100)}%</dd><dt>Packet loss</dt><dd>${health.lossPct ?? .1}%</dd><dt>Latency</dt><dd>${health.latencyMs ?? 12} ms</dd>`;
  const related = state.edges.filter((edge) => edge.source === node.id || edge.target === node.id).slice(0, 9);
  $("#connections").innerHTML = related.map((edge) => `<div class="connection"><span>${edge.source === node.id ? "→" : "←"} ${edge.source === node.id ? edge.target : edge.source}</span><small>${edge.type}</small></div>`).join("") || "No relationships";
}

async function enterInvestigation(node = state.selected) {
  if (!node) return;
  state.selected = node;
  state.focusRoot = node;
  state.view = "investigation";
  $("#app").dataset.view = "investigation";
  $("#investigation").hidden = false;
  $("#backToAtlas").hidden = false;
  await loadInvestigation();
}

async function loadInvestigation() {
  const root = state.focusRoot;
  $("#investigationTitle").textContent = root.name;
  $("#investigationSummary").textContent = `${root.id} · loading ${state.direction} dependencies…`;
  const response = await fetch(`/api/neighborhood/${encodeURIComponent(root.id)}?hops=3&direction=${state.direction}`);
  if (!response.ok) throw new Error("Could not load dependency neighborhood");
  state.investigationData = await response.json();
  renderInvestigation();
}

function renderInvestigation() {
  const data = state.investigationData;
  if (!data) return;
  const orderedGroups = state.direction === "upstream" ? [...groupOrder].reverse() : groupOrder;
  const columns = orderedGroups.map((group) => ({ ...group, nodes: data.nodes.filter((node) => group.types.includes(node.type)) })).filter((group) => group.nodes.length);
  $("#investigationSummary").textContent = `${state.direction === "downstream" ? "Origin to impact" : "Impact to origin"} · ${data.nodes.length} elements · ${data.edges.length} relationships · three hops`;
  $("#dependencyColumns").innerHTML = columns.map((group) => {
    const visible = sortFocused(group.nodes).slice(0, 12);
    const cards = visible.map((node) => dependencyCard(node)).join("");
    const overflow = group.nodes.length > visible.length ? `<div class="overflow-note">+ ${group.nodes.length - visible.length} additional elements</div>` : "";
    return `<section class="dependency-column"><div class="column-title"><strong>${group.label}</strong><small>${group.nodes.length} reachable</small></div>${cards}${overflow}</section>`;
  }).join("");
  document.querySelectorAll(".dependency-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selected = state.byId.get(card.dataset.id);
      document.querySelectorAll(".dependency-card").forEach((item) => item.classList.toggle("selected", item.dataset.id === card.dataset.id));
      drawDependencyEdges();
    });
    card.addEventListener("dblclick", () => {
      state.focusRoot = state.byId.get(card.dataset.id);
      state.selected = state.focusRoot;
      loadInvestigation();
    });
  });
  requestAnimationFrame(drawDependencyEdges);
}

function sortFocused(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.id === state.focusRoot.id) return -1;
    if (b.id === state.focusRoot.id) return 1;
    return a.depth - b.depth || b.criticality - a.criticality || a.name.localeCompare(b.name);
  });
}

function dependencyCard(node) {
  const health = nodeHealth(node);
  const selected = node.id === state.focusRoot.id ? " selected" : "";
  const connectionCount = state.edges.filter((edge) => edge.source === node.id || edge.target === node.id).length;
  return `<article class="dependency-card ${health}${selected}" data-id="${node.id}" style="--node-color:${layerColor[node.layer]}"><strong>${node.name}</strong><small>${health === "healthy" ? `${connectionCount} connections` : health.toUpperCase()}</small></article>`;
}

function drawDependencyEdges() {
  if (state.view !== "investigation" || !state.investigationData) return;
  const viewport = $("#dependencyViewport");
  const svg = $("#dependencyEdges");
  const viewportRect = viewport.getBoundingClientRect();
  const cards = new Map([...document.querySelectorAll(".dependency-card")].map((card) => [card.dataset.id, card]));
  const width = Math.max(viewport.scrollWidth, viewport.clientWidth);
  const height = Math.max(viewport.scrollHeight, viewport.clientHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.innerHTML = state.investigationData.edges.filter((edge) => state.enabledEdges.has(edge.type) && cards.has(edge.source) && cards.has(edge.target)).map((edge) => {
    const source = cards.get(edge.source).getBoundingClientRect();
    const target = cards.get(edge.target).getBoundingClientRect();
    let x1 = source.right - viewportRect.left + viewport.scrollLeft;
    let y1 = source.top + source.height / 2 - viewportRect.top + viewport.scrollTop;
    let x2 = target.left - viewportRect.left + viewport.scrollLeft;
    let y2 = target.top + target.height / 2 - viewportRect.top + viewport.scrollTop;
    if (x2 < x1) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
    const bend = Math.max(30, (x2 - x1) * .48);
    const active = edge.source === state.selected?.id || edge.target === state.selected?.id ? "active" : "";
    return `<path class="${active}" d="M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}"/>`;
  }).join("");
}

function refreshDependencyHealth() {
  if (state.view !== "investigation") return;
  document.querySelectorAll(".dependency-card").forEach((card) => {
    const node = state.byId.get(card.dataset.id);
    card.classList.remove("healthy", "degraded", "critical");
    card.classList.add(nodeHealth(node));
  });
}

function nodeHealth(node) { return state.health.get(node.id)?.health || node.health || "unknown"; }

function returnToAtlas() {
  state.view = "atlas";
  state.investigationData = null;
  $("#app").dataset.view = "atlas";
  $("#investigation").hidden = true;
  $("#backToAtlas").hidden = true;
  if (state.selected) showDetails(state.selected);
  requestAnimationFrame(drawAtlas);
}

canvas.addEventListener("pointerdown", (event) => {
  state.drag = { x: event.clientX, y: event.clientY, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!state.drag) return;
  const dx = event.clientX - state.drag.x;
  const dy = event.clientY - state.drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) state.drag.moved = true;
  state.orbit += dx * .0025;
  state.tilt = Math.max(-1, Math.min(1, state.tilt + dy * .003));
  state.drag.x = event.clientX;
  state.drag.y = event.clientY;
  drawAtlas();
});
canvas.addEventListener("pointerup", (event) => {
  const bounds = canvas.getBoundingClientRect();
  if (!state.drag?.moved) {
    const node = findNodeAt(event.clientX - bounds.left, event.clientY - bounds.top);
    if (node) selectNode(node);
  }
  state.drag = null;
});
canvas.addEventListener("dblclick", (event) => {
  const bounds = canvas.getBoundingClientRect();
  const node = findNodeAt(event.clientX - bounds.left, event.clientY - bounds.top);
  if (node) enterInvestigation(node);
});
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  state.zoom = Math.max(.55, Math.min(2.25, state.zoom * Math.exp(-event.deltaY * .001)));
  drawAtlas();
}, { passive: false });

let searchTimer;
$("#search").addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const query = event.target.value.trim();
    if (!query) return $("#searchResults").replaceChildren();
    const data = await fetch(`/api/nodes?query=${encodeURIComponent(query)}&limit=15`).then((response) => response.json());
    $("#searchResults").innerHTML = data.items.map((node) => `<div class="result" data-id="${node.id}"><strong>${node.name}</strong><small>${node.id} · ${node.layer}</small></div>`).join("");
    document.querySelectorAll(".result").forEach((result) => result.addEventListener("click", () => {
      const node = state.byId.get(result.dataset.id);
      $("#searchResults").replaceChildren();
      $("#search").value = node.id;
      selectNode(node);
    }));
  }, 150);
});

$("#investigate").addEventListener("click", () => enterInvestigation());
$("#backToAtlas").addEventListener("click", returnToAtlas);
$("#closeDetails").addEventListener("click", clearSelection);
$("#resetView").addEventListener("click", () => { state.zoom = 1; state.orbit = 0; state.tilt = 0; clearSelection(); });
$("#filtersToggle").addEventListener("click", () => { $("#filterTray").hidden = !$("#filterTray").hidden; });
document.querySelectorAll("[data-direction]").forEach((button) => button.addEventListener("click", async () => {
  state.direction = button.dataset.direction;
  document.querySelectorAll("[data-direction]").forEach((item) => item.classList.toggle("active", item === button));
  await loadInvestigation();
}));
$("#dependencyViewport").addEventListener("scroll", drawDependencyEdges, { passive: true });
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== $("#search") && state.view === "atlas") { event.preventDefault(); $("#search").focus(); }
  if (event.key === "Escape") state.view === "investigation" ? returnToAtlas() : clearSelection();
});
window.addEventListener("resize", resize);

function formatBytes(bytes) { return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(1)} KB`; }
load().catch((error) => { $("#liveLabel").textContent = `Load failed: ${error.message}`; console.error(error); });
