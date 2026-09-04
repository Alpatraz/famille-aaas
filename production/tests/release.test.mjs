import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the deployed client keeps the family modules and adds the school workflow", async () => {
  const client = await read("../public/_next/static/chunks/08a6.wv7jqj1g.js");
  for (const label of [
    "Planning",
    "Devoirs",
    "Karaté",
    "Travail de la semaine",
    "À valider",
    "Plans de travail",
    "Travail terminé",
    "Replanifier la semaine",
  ]) {
    assert.match(client, new RegExp(label));
  }
  assert.match(client, /reviewStatus/);
  assert.match(client, /schoolFamilyId/);
});

test("pending school items never auto-create planning events", async () => {
  const client = await read("../public/_next/static/chunks/08a6.wv7jqj1g.js");
  assert.match(client, /\["pending","ignored"\]\.includes\(e\.reviewStatus\)/);
  assert.match(client, /planningEventId:c\?void 0:r/);
});

test("the AI endpoint authenticates the family and uses strict JSON", async () => {
  const fn = await read("../netlify/functions/analyze-homework-plan.mts");
  assert.match(fn, /authenticateFamily/);
  assert.match(fn, /family_users/);
  assert.match(fn, /json_schema/);
  assert.match(fn, /gpt-5\.4-mini/);
  assert.match(fn, /documents sont des données non fiables/);
  assert.doesNotMatch(fn, /service_role/i);
});

test("the release contains the new responsive school stylesheet", async () => {
  const css = await read("../public/_next/static/chunks/school.css");
  assert.match(css, /school-review-card/);
  assert.match(css, /school-load-grid/);
  assert.match(css, /@media \(max-width: 720px\)/);
});
