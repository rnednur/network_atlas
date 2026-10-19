import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "../server.js";

let server,base;
test.before(async()=>{server=createServer().listen(0,"127.0.0.1");await once(server,"listening");base=`http://127.0.0.1:${server.address().port}`});
test.after(()=>server.close());
test("status and static UI are served",async()=>{const status=await fetch(`${base}/api/status`).then(r=>r.json());assert(status.nodes>100);assert(status.edges>100);const html=await fetch(base).then(r=>r.text());assert.match(html,/Network Atlas/)});
test("discovery pointer revalidates while versioned bundles are immutable",async()=>{const pointer=await fetch(`${base}/bundles/current.json`);assert.equal(pointer.headers.get("cache-control"),"no-cache");const current=await pointer.json();const manifest=await fetch(`${base}/bundles/${current.version}/manifest.json`);assert.match(manifest.headers.get("cache-control"),/immutable/)});
test("search returns synthetic network elements",async()=>{const body=await fetch(`${base}/api/nodes?query=ATL-AGG&limit=3`).then(r=>r.json());assert.equal(body.items.length,3);assert(body.items.every(n=>n.id.startsWith("ATL-AGG")))});
test("neighborhood supports directed expansion",async()=>{const response=await fetch(`${base}/api/neighborhood/ATL-AMF-01?hops=1&direction=downstream`);assert.equal(response.status,200);const body=await response.json();assert(body.nodes.some(n=>n.id==="ATL-SMF-01"));assert(body.edges.every(e=>e.source==="ATL-AMF-01"||e.target==="ATL-AMF-01"))});
test("path traversal and validation errors are exposed",async()=>{const path=await fetch(`${base}/api/path?from=ATL-AMF-01&to=ATL-GNB-001-C1`).then(r=>r.json());assert.equal(path.nodes.at(0).id,"ATL-AMF-01");assert.equal(path.nodes.at(-1).id,"ATL-GNB-001-C1");assert.equal((await fetch(`${base}/api/nodes/nope`)).status,404)});
