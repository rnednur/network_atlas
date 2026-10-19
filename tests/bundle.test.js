import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const current=JSON.parse(await readFile(path.join(root,"data/current.json"),"utf8"));
const dir=path.join(root,"data/snapshots",current.version);
const manifest=JSON.parse(await readFile(path.join(dir,"manifest.json"),"utf8"));

test("manifest describes all bundle files with valid checksums",async()=>{
  for(const [name,spec] of Object.entries(manifest.files)){const data=await readFile(path.join(dir,name));assert.equal(data.length,spec.bytes,name);assert.equal(createHash("sha256").update(data).digest("hex"),spec.sha256,name)}
});
test("binary headers and counts agree with manifest",async()=>{
  for(const [name,magic,count] of [["nodes.bin","NATL",manifest.nodeCount],["positions.bin","NPOS",manifest.nodeCount],["edges.bin","NEDG",manifest.edgeCount]]){const data=await readFile(path.join(dir,name));assert.equal(data.toString("ascii",0,4),magic);assert.equal(data.readUInt16LE(4),1);assert.equal(data.readUInt32LE(8),count)}
});
test("metadata IDs and edge endpoints are valid",async()=>{const meta=JSON.parse(await readFile(path.join(dir,"metadata.json"),"utf8")),ids=new Set(meta.nodes.map(n=>n.id));assert.equal(ids.size,manifest.nodeCount);assert.equal(meta.edges.length,manifest.edgeCount);for(const e of meta.edges){assert(ids.has(e.source));assert(ids.has(e.target))}});
