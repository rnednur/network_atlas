import test from "node:test";
import assert from "node:assert/strict";
import { indexGraph, searchNodes, shortestPath, traverse } from "../src/graph.js";

const nodes=[{id:"A",name:"Core A",type:"AMF",market:"ATL"},{id:"B",name:"Router B",type:"AGG",market:"ATL"},{id:"C",name:"gNB C",type:"GNB",market:"ATL"},{id:"D",name:"Backup D",type:"AGG",market:"BOS"}];
const edges=[{id:"1",source:"A",target:"B",type:"CONTROLS",directed:true},{id:"2",source:"B",target:"C",type:"PHYSICAL",directed:false},{id:"3",source:"D",target:"B",type:"BACKUP",directed:true}];
const graph=indexGraph(nodes,edges);

test("search is partial, case-insensitive, and filterable",()=>{
  assert.equal(searchNodes(nodes,"router").at(0).id,"B");
  assert.deepEqual(searchNodes(nodes,"",{market:"BOS"}).map(n=>n.id),["D"]);
});
test("directed downstream traversal respects direction",()=>{
  assert.deepEqual(new Set(traverse(graph,"A",{hops:2,direction:"downstream"}).nodes.map(n=>n.id)),new Set(["A","B","C"]));
  assert.deepEqual(new Set(traverse(graph,"B",{hops:1,direction:"upstream"}).nodes.map(n=>n.id)),new Set(["A","B","C","D"]));
});
test("edge type filters constrain traversal",()=>{
  assert.deepEqual(traverse(graph,"B",{hops:2,direction:"both",edgeTypes:["PHYSICAL"]}).nodes.map(n=>n.id).sort(),["B","C"]);
});
test("shortest path follows allowed directed orientation",()=>{
  assert.deepEqual(shortestPath(graph,"A","C").nodes.map(n=>n.id),["A","B","C"]);
  assert.deepEqual(shortestPath(graph,"C","A").nodes,[]);
});
test("bad edge references fail fast",()=>assert.throws(()=>indexGraph(nodes,[{source:"A",target:"missing",directed:true}]),/unknown node/));
