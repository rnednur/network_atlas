import { createHash } from "node:crypto";
import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EDGE_TYPES, HEALTH, LAYERS, NODE_TYPES, indexGraph } from "../src/graph.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = "v3-synthetic-2026-10-19";
const snapshot = path.join(root, "data", "snapshots", version);
const publicBundles = path.join(root, "public", "bundles");

function rng(seed = 0xA71A5) { return () => ((seed = Math.imul(seed ^ seed >>> 15, 1 | seed), seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed), ((seed ^ seed >>> 14) >>> 0) / 4294967296)); }
const random = rng();
const nodes = [];
const edges = [];
const markets = ["ATL", "BOS", "DEN"];
const addNode = (id, name, type, layer, market, x, y, z, criticality = .5) => {
  nodes.push({ id, name, type, typeCode: NODE_TYPES[type], layer, layerCode: LAYERS[layer], market, marketCode: markets.indexOf(market), x, y, z, health: "healthy", healthCode: HEALTH.healthy, criticality: +criticality.toFixed(3) });
};
const addEdge = (source, target, type, directed = true, weight = 1) => edges.push({ id: `E-${String(edges.length).padStart(5, "0")}`, source, target, type, typeCode: EDGE_TYPES[type], directed, weight });

markets.forEach((market, mi) => {
  const y0 = (mi - 1) * 92;
  ["AMF", "SMF", "UPF"].forEach((type, i) => addNode(`${market}-${type}-01`, `${market} ${type} 01`, type, "Core", market, -125 + i * 20, y0 + (i - 1) * 17, (random() - .5) * 20, .9 - i * .08));
  for (let pe = 1; pe <= 2; pe += 1) addNode(`${market}-PE-0${pe}`, `${market} Provider Edge 0${pe}`, "PE", "Transport", market, -48, y0 + (pe * 38 - 57), (random() - .5) * 24, .82);
  for (let agg = 1; agg <= 6; agg += 1) addNode(`${market}-AGG-${String(agg).padStart(3,"0")}`, `${market} Aggregation ${String(agg).padStart(3,"0")}`, "AGG", "Transport", market, 10, y0 + (agg - 3.5) * 14, (random() - .5) * 30, .55 + random() * .2);
  for (let site = 1; site <= 18; site += 1) {
    const angle = (site / 18) * Math.PI * 2;
    const gnb = `${market}-GNB-${String(site).padStart(3,"0")}`;
    addNode(gnb, `${market} gNB ${String(site).padStart(3,"0")}`, "GNB", "RAN", market, 80 + Math.cos(angle) * 32, y0 + Math.sin(angle) * 58, (random() - .5) * 42, .3 + random() * .35);
    for (let sector = 1; sector <= 3; sector += 1) addNode(`${gnb}-C${sector}`, `${market} Cell ${String(site).padStart(3,"0")}-${sector}`, "CELL", "RAN", market, 132 + Math.cos(angle + sector * .13) * 28, y0 + Math.sin(angle + sector * .13) * 66, (random() - .5) * 52, .15 + random() * .2);
  }
  addEdge(`${market}-AMF-01`, `${market}-SMF-01`, "CONTROLS", true, .9);
  addEdge(`${market}-SMF-01`, `${market}-UPF-01`, "CONTROLS", true, .9);
  for (let pe = 1; pe <= 2; pe += 1) {
    addEdge(`${market}-UPF-01`, `${market}-PE-0${pe}`, pe === 1 ? "CARRIES" : "BACKUP", true, pe === 1 ? 1 : .45);
    addEdge(`${market}-AMF-01`, `${market}-PE-0${pe}`, "DEPENDS_ON", true, .75);
  }
  for (let agg = 1; agg <= 6; agg += 1) {
    const pe = agg <= 3 ? 1 : 2;
    addEdge(`${market}-PE-0${pe}`, `${market}-AGG-${String(agg).padStart(3,"0")}`, "PHYSICAL", false, 1);
    addEdge(`${market}-PE-0${pe === 1 ? 2 : 1}`, `${market}-AGG-${String(agg).padStart(3,"0")}`, "BACKUP", true, .35);
  }
  for (let site = 1; site <= 18; site += 1) {
    const agg = ((site - 1) % 6) + 1;
    const gnb = `${market}-GNB-${String(site).padStart(3,"0")}`;
    addEdge(`${market}-AGG-${String(agg).padStart(3,"0")}`, gnb, "PHYSICAL", false, 1);
    addEdge(`${market}-AMF-01`, gnb, "CONTROLS", true, .8);
    for (let sector = 1; sector <= 3; sector += 1) addEdge(gnb, `${gnb}-C${sector}`, "DEPENDS_ON", true, 1);
  }
});
addEdge("ATL-UPF-01", "BOS-UPF-01", "CARRIES", false, .7);
addEdge("BOS-UPF-01", "DEN-UPF-01", "CARRIES", false, .7);
addEdge("DEN-UPF-01", "ATL-UPF-01", "BACKUP", true, .35);

function header(magic, count, recordSize) { const b = Buffer.alloc(16); b.write(magic, 0, 4, "ascii"); b.writeUInt16LE(1, 4); b.writeUInt16LE(recordSize, 6); b.writeUInt32LE(count, 8); return b; }
function encodeNodes() {
  const out = Buffer.alloc(16 + nodes.length * 16); header("NATL", nodes.length, 16).copy(out);
  nodes.forEach((n, i) => { const o = 16 + i * 16; out.writeUInt32LE(i, o); out.writeUInt8(n.typeCode, o + 4); out.writeUInt8(n.layerCode, o + 5); out.writeUInt8(n.healthCode, o + 6); out.writeUInt8(0, o + 7); out.writeUInt16LE(n.marketCode, o + 8); out.writeFloatLE(n.criticality, o + 12); }); return out;
}
function encodePositions() { const out = Buffer.alloc(16 + nodes.length * 12); header("NPOS", nodes.length, 12).copy(out); nodes.forEach((n,i) => { const o=16+i*12; out.writeFloatLE(n.x,o);out.writeFloatLE(n.y,o+4);out.writeFloatLE(n.z,o+8); }); return out; }
function encodeEdges() { const byId=new Map(nodes.map((n,i)=>[n.id,i])); const out=Buffer.alloc(16+edges.length*16); header("NEDG",edges.length,16).copy(out); edges.forEach((e,i)=>{const o=16+i*16;out.writeUInt32LE(byId.get(e.source),o);out.writeUInt32LE(byId.get(e.target),o+4);out.writeUInt8(e.typeCode,o+8);out.writeUInt8(e.directed?1:0,o+9);out.writeFloatLE(e.weight,o+12)});return out; }
function encodeAdjacency(direction) { const graph=indexGraph(nodes,edges); const lists=direction==="forward"?graph.outgoing:graph.incoming; const count=lists.reduce((n,l)=>n+l.length,0); const out=Buffer.alloc(16+(nodes.length+1)*4+count*8); header(direction==="forward"?"NFWD":"NREV",nodes.length,0).copy(out);out.writeUInt32LE(count,12);let cursor=0;lists.forEach((list,i)=>{out.writeUInt32LE(cursor,16+i*4);cursor+=list.length});out.writeUInt32LE(cursor,16+nodes.length*4);let o=16+(nodes.length+1)*4;for(const list of lists)for(const ref of list){out.writeUInt32LE(ref.node,o);out.writeUInt32LE(ref.edge,o+4);o+=8}return out; }
const checksum = (data) => createHash("sha256").update(data).digest("hex");

await mkdir(snapshot, { recursive: true });
const files = { "nodes.bin": encodeNodes(), "positions.bin": encodePositions(), "edges.bin": encodeEdges(), "adjacency-forward.bin": encodeAdjacency("forward"), "adjacency-reverse.bin": encodeAdjacency("reverse"), "metadata.json": Buffer.from(JSON.stringify({ nodes: nodes.map(({x,y,z,...n})=>n), edges, markets }, null, 2)) };
for (const [name,data] of Object.entries(files)) await writeFile(path.join(snapshot,name),data);
const manifest = { schemaVersion: 1, bundleVersion: version, createdAt: "2026-10-19T00:00:00.000Z", byteOrder: "little-endian", nodeCount: nodes.length, edgeCount: edges.length, markets, typeCodes: { nodes: NODE_TYPES, edges: EDGE_TYPES, layers: LAYERS, health: HEALTH }, files: Object.fromEntries(Object.entries(files).map(([name,data])=>[name,{ bytes:data.length, sha256:checksum(data), contentType:name.endsWith(".json")?"application/json":"application/octet-stream" }])), formats: { header: "16 bytes: magic[4], schema u16, recordSize u16, count u32, auxiliary u32", nodes: "16-byte records: index u32, type u8, layer u8, health u8, flags u8, market u16, reserved u16, criticality f32", edges: "16-byte records: source u32, target u32, type u8, directed u8, status u8, reserved u8, weight f32", positions: "12-byte records: x/y/z float32", adjacency: "header auxiliary=reference count; offsets u32[nodeCount+1], then {neighbor u32, edgeIndex u32}[referenceCount]" } };
await writeFile(path.join(snapshot,"manifest.json"),JSON.stringify(manifest,null,2));
await mkdir(publicBundles,{recursive:true});
await writeFile(path.join(root,"data","current.json"),JSON.stringify({version,manifest:`snapshots/${version}/manifest.json`},null,2));
await writeFile(path.join(publicBundles,"current.json"),JSON.stringify({version,manifest:`${version}/manifest.json`},null,2));
await mkdir(path.join(publicBundles,version),{recursive:true});
for (const name of [...Object.keys(files),"manifest.json"]) await writeFile(path.join(publicBundles,version,name),await readFile(path.join(snapshot,name)));
await writeFile(path.join(root,"data","state","health.json"),JSON.stringify({sequence:0,generatedAt:"2026-10-19T00:00:00.000Z",updates:[{id:"ATL-AGG-003",health:"degraded",lossPct:4.8},{id:"ATL-GNB-009",health:"critical",lossPct:12.6},{id:"BOS-UPF-01",health:"degraded",latencyMs:38}]},null,2));
console.log(`Generated ${version}: ${nodes.length} nodes, ${edges.length} edges`);
