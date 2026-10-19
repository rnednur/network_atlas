import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const html = await readFile(path.join(root, "public/index.html"), "utf8");
const app = await readFile(path.join(root, "public/app.js"), "utf8");

test("UI exposes Atlas and dependency investigation modes", () => {
  assert.match(html, /data-view="atlas"/);
  assert.match(html, /id="investigation"/);
  assert.match(html, /Origin → Impact/);
  assert.match(html, /Impact → Origin/);
});

test("double-click enters investigation and Escape returns to Atlas", () => {
  assert.match(app, /addEventListener\("dblclick"/);
  assert.match(app, /enterInvestigation\(node\)/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /returnToAtlas/);
});

test("overview uses an explicit top-to-bottom hierarchy", () => {
  assert.match(app, /node\.type === "CELL" \? \.79/);
  assert.match(app, /node\.type === "GNB" \? \.64/);
  assert.match(app, /node\.type === "AGG" \? \.45/);
});
