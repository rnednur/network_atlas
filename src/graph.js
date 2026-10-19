export const NODE_TYPES = Object.freeze({ AMF: 1, SMF: 2, UPF: 3, PE: 10, AGG: 11, GNB: 20, CELL: 21 });
export const EDGE_TYPES = Object.freeze({ PHYSICAL: 1, CARRIES: 2, CONTROLS: 3, DEPENDS_ON: 4, BACKUP: 5 });
export const LAYERS = Object.freeze({ Core: 1, Transport: 2, RAN: 3 });
export const HEALTH = Object.freeze({ healthy: 0, degraded: 1, critical: 2, unknown: 3 });

export function indexGraph(nodes, edges) {
  const byId = new Map(nodes.map((n, index) => [n.id, { ...n, index }]));
  const outgoing = Array.from({ length: nodes.length }, () => []);
  const incoming = Array.from({ length: nodes.length }, () => []);
  edges.forEach((edge, edgeIndex) => {
    const source = byId.get(edge.source)?.index;
    const target = byId.get(edge.target)?.index;
    if (source === undefined || target === undefined) throw new Error(`Edge ${edgeIndex} references an unknown node`);
    outgoing[source].push({ node: target, edge: edgeIndex });
    incoming[target].push({ node: source, edge: edgeIndex });
    if (!edge.directed) {
      outgoing[target].push({ node: source, edge: edgeIndex });
      incoming[source].push({ node: target, edge: edgeIndex });
    }
  });
  return { nodes, edges, byId, outgoing, incoming };
}

export function traverse(graph, startId, { hops = 1, direction = "both", edgeTypes } = {}) {
  const start = graph.byId.get(startId);
  if (!start) return null;
  const allowed = edgeTypes?.length ? new Set(edgeTypes) : null;
  const visited = new Map([[start.index, 0]]);
  const includedEdges = new Set();
  let frontier = [start.index];
  for (let depth = 1; depth <= Math.min(Math.max(Number(hops) || 1, 0), 8); depth += 1) {
    const next = [];
    for (const index of frontier) {
      const candidates = direction === "downstream" ? graph.outgoing[index]
        : direction === "upstream" ? graph.incoming[index]
        : [...graph.outgoing[index], ...graph.incoming[index]];
      for (const ref of candidates) {
        const edge = graph.edges[ref.edge];
        if (allowed && !allowed.has(edge.type)) continue;
        includedEdges.add(ref.edge);
        if (!visited.has(ref.node)) { visited.set(ref.node, depth); next.push(ref.node); }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return {
    root: startId,
    nodes: [...visited].map(([index, depth]) => ({ ...graph.nodes[index], depth })),
    edges: [...includedEdges].map((index) => graph.edges[index])
      .filter((edge) => visited.has(graph.byId.get(edge.source).index) && visited.has(graph.byId.get(edge.target).index))
  };
}

export function shortestPath(graph, fromId, toId, maxHops = 12) {
  const from = graph.byId.get(fromId)?.index;
  const to = graph.byId.get(toId)?.index;
  if (from === undefined || to === undefined) return null;
  const queue = [from];
  const previous = new Map([[from, null]]);
  const via = new Map();
  while (queue.length) {
    const current = queue.shift();
    if (current === to) break;
    const distance = pathDepth(previous, current);
    if (distance >= maxHops) continue;
    for (const ref of graph.outgoing[current]) {
      if (!previous.has(ref.node)) { previous.set(ref.node, current); via.set(ref.node, ref.edge); queue.push(ref.node); }
    }
  }
  if (!previous.has(to)) return { nodes: [], edges: [] };
  const nodeIndexes = [];
  const edgeIndexes = [];
  for (let cursor = to; cursor !== null; cursor = previous.get(cursor)) {
    nodeIndexes.push(cursor);
    if (via.has(cursor)) edgeIndexes.push(via.get(cursor));
  }
  return { nodes: nodeIndexes.reverse().map((i) => graph.nodes[i]), edges: edgeIndexes.reverse().map((i) => graph.edges[i]) };
}

function pathDepth(previous, node) {
  let depth = 0;
  for (let cursor = node; previous.get(cursor) !== null; cursor = previous.get(cursor)) depth += 1;
  return depth;
}

export function searchNodes(nodes, query, { type, market, limit = 25 } = {}) {
  const needle = String(query || "").trim().toLowerCase();
  return nodes.filter((node) => (!needle || `${node.id} ${node.name} ${node.type}`.toLowerCase().includes(needle))
    && (!type || node.type === type) && (!market || node.market === market))
    .sort((a, b) => (a.name.toLowerCase().startsWith(needle) ? -1 : 1) - (b.name.toLowerCase().startsWith(needle) ? -1 : 1))
    .slice(0, Math.min(Number(limit) || 25, 100));
}
