import http from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indexGraph, searchNodes, shortestPath, traverse } from "./src/graph.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");
const current = JSON.parse(await readFile(path.join(root,"data","current.json"),"utf8"));
const snapshotDir = path.join(root,"data",current.manifest,"..");
const metadata = JSON.parse(await readFile(path.join(snapshotDir,"metadata.json"),"utf8"));
const initialHealth = JSON.parse(await readFile(path.join(root,"data","state","health.json"),"utf8"));
const graph = indexGraph(metadata.nodes, metadata.edges);
const port = Number(process.env.PORT || 8000);
let healthSequence = initialHealth.sequence;

export function createServer() {
  return http.createServer(async (req,res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) return routeApi(url,req,res);
      return serveStatic(url.pathname,res);
    } catch (error) { json(res,500,{error:"internal_error",message:error.message}); }
  });
}

function routeApi(url,req,res) {
  if (req.method !== "GET") return json(res,405,{error:"method_not_allowed"});
  if (url.pathname === "/api/status") return json(res,200,{name:"Network Atlas Graph API",version:current.version,nodes:graph.nodes.length,edges:graph.edges.length});
  if (url.pathname === "/api/nodes") return json(res,200,{items:searchNodes(graph.nodes,url.searchParams.get("query"),{type:url.searchParams.get("type"),market:url.searchParams.get("market"),limit:url.searchParams.get("limit")})});
  if (url.pathname === "/api/health") return json(res,200,healthSnapshot(url.searchParams.get("since")));
  if (url.pathname === "/api/faults") return json(res,200,{items:healthSnapshot().updates.filter(x=>x.health!=="healthy")});
  if (url.pathname === "/api/health/stream") return healthStream(req,res);
  if (url.pathname === "/api/path") {
    const result=shortestPath(graph,url.searchParams.get("from"),url.searchParams.get("to"));
    return result===null?json(res,404,{error:"node_not_found"}):json(res,200,result);
  }
  const neighborhood=url.pathname.match(/^\/api\/neighborhood\/([^/]+)$/);
  if(neighborhood){const result=traverse(graph,decodeURIComponent(neighborhood[1]),{hops:url.searchParams.get("hops"),direction:url.searchParams.get("direction")||"both",edgeTypes:url.searchParams.getAll("edgeType")});return result?json(res,200,result):json(res,404,{error:"node_not_found"});}
  const nodeMatch=url.pathname.match(/^\/api\/nodes\/([^/]+)$/);
  if(nodeMatch){const node=graph.byId.get(decodeURIComponent(nodeMatch[1]));return node?json(res,200,node):json(res,404,{error:"node_not_found"});}
  return json(res,404,{error:"not_found"});
}

function healthSnapshot(since) {
  healthSequence += 1;
  const phase=Math.floor(Date.now()/15000)%4;
  const live=[...initialHealth.updates,{id:"DEN-AGG-005",health:phase===0?"critical":phase===1?"degraded":"healthy",lossPct:phase===0?18.2:phase===1?5.1:.1}];
  return {sequence:healthSequence,generatedAt:new Date().toISOString(),since:Number(since)||0,updates:live};
}
function healthStream(req,res){res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive"});const send=()=>res.write(`event: health\ndata: ${JSON.stringify(healthSnapshot())}\n\n`);send();const timer=setInterval(send,3000);req.on("close",()=>clearInterval(timer));}
function json(res,status,body){const data=JSON.stringify(body);res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Content-Length":Buffer.byteLength(data),"Access-Control-Allow-Origin":"*"});res.end(data);}
async function serveStatic(requestPath,res){const decoded=decodeURIComponent(requestPath==="/"?"/index.html":requestPath);const candidate=path.resolve(publicDir,`.${decoded}`);if(!candidate.startsWith(`${publicDir}${path.sep}`))return json(res,403,{error:"forbidden"});try{const info=await stat(candidate);if(!info.isFile())throw new Error("not file");const ext=path.extname(candidate);const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".bin":"application/octet-stream",".svg":"image/svg+xml"};const immutable=decoded.startsWith("/bundles/")&&decoded!=="/bundles/current.json";res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Content-Length":info.size,"Cache-Control":immutable?"public, max-age=31536000, immutable":"no-cache"});createReadStream(candidate).pipe(res);}catch{json(res,404,{error:"not_found"});}}

if (process.argv[1] === fileURLToPath(import.meta.url)) createServer().listen(port,()=>console.log(`Network Atlas v3: http://localhost:${port}`));
