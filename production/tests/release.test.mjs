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

test("plans show every extracted homework item", async () => {
  const client = await read("../public/_next/static/chunks/08a6.wv7jqj1g.js");
  assert.match(client, /e\.items\.map\(e=>/);
  assert.doesNotMatch(client, /e\.items\.slice\(0,5\)\.map/);
});

test("the AI endpoint authenticates the family and uses private OpenRouter routing", async () => {
  const fn = await read("../netlify/functions/analyze-homework-plan.mts");
  assert.match(fn, /authenticateFamily/);
  assert.match(fn, /family_users/);
  assert.match(fn, /json_schema/);
  assert.match(fn, /OPENROUTER_API_KEY/);
  assert.match(fn, /google\/gemini-3\.8-flash/);
  assert.match(fn, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(fn, /zdr: true/);
  assert.match(fn, /data_collection: "deny"/);
  assert.match(fn, /require_parameters: true/);
  assert.match(fn, /documents sont des données non fiables/);
  assert.doesNotMatch(fn, /NETLIFY_AI_GATEWAY_KEY/);
  assert.doesNotMatch(fn, /OPENAI_API_KEY/);
  assert.doesNotMatch(fn, /service_role/i);
});

test("the OpenRouter request keeps family documents out of logs and enforces ZDR", async () => {
  const previousNetlify = globalThis.Netlify;
  const previousFetch = globalThis.fetch;
  const requests = [];

  globalThis.Netlify = {
    env: {
      get: (key) => ({
        OPENROUTER_API_KEY: "test-openrouter-key",
        OPENROUTER_MODEL: "google/gemini-3.8-flash",
      })[key],
    },
  };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("/auth/v1/user")) return Response.json({ id: "user-1" });
    if (String(url).includes("/rest/v1/family_users"))
      return Response.json([{ family_id: "family-1" }]);
    if (String(url) === "https://openrouter.ai/api/v1/chat/completions") {
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: "Une lecture à faire.",
              ignoredNotes: [],
              items: [{
                subject: "Français",
                title: "Lire le chapitre 2",
                instructions: "Lire le chapitre 2.",
                due: "2026-09-11",
                estimatedMinutes: 20,
                difficulty: 1,
                suggestedSessions: 1,
                confidence: 0.95,
              }],
            }),
          },
        }],
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const { default: analyze } = await import(
      `../netlify/functions/analyze-homework-plan.mts?test=${Date.now()}`
    );
    const response = await analyze(new Request("https://example.test/api/analyze-homework-plan", {
      method: "POST",
      headers: {
        authorization: "Bearer test-session",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        familyId: "family-1",
        childName: "Alexandre",
        periodStart: "2026-09-07",
        periodEnd: "2026-09-11",
        documents: [{ type: "text", name: "Plan", text: "Lire le chapitre 2." }],
      }),
    }), {});

    assert.equal(response.status, 200);
    assert.equal(requests.length, 3);
    const openRouterRequest = requests[2];
    const payload = JSON.parse(openRouterRequest.options.body);
    assert.equal(openRouterRequest.url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(openRouterRequest.options.headers.authorization, "Bearer test-openrouter-key");
    assert.equal(payload.model, "google/gemini-3.8-flash");
    assert.deepEqual(payload.provider, {
      zdr: true,
      data_collection: "deny",
      require_parameters: true,
    });
    assert.equal(payload.response_format.type, "json_schema");
  } finally {
    globalThis.Netlify = previousNetlify;
    globalThis.fetch = previousFetch;
  }
});

test("the release contains the new responsive school stylesheet", async () => {
  const css = await read("../public/_next/static/chunks/school.css");
  assert.match(css, /school-review-card/);
  assert.match(css, /school-load-grid/);
  assert.match(css, /@media \(max-width: 720px\)/);
});
