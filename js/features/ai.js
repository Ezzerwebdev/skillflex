// [2024-11-21] Added placement/practice mode switch + richer local mocks for offline/testing.
/**
 * SkillFlex AI Game Engine (Frontend Client)
 * Connects to Laravel Backend Proxy
 */

let _appInterface = null;

/**
 * Initialize the AI module with hooks to the main app
 * This is called by app.js
 */
export function initAI(core) {
  _appInterface = core;
  console.log("🤖 AI Module Ready (v-stub-1)");

  // Single, canonical entry point
  window.aiGame = {
    generateChallenge: callLaravelAI,
  };
}

/**
 * Call YOUR Backend (Laravel), not Google directly.
 * Laravel handles the API Key security and Curriculum Logic.
 */
async function callLaravelAI(contextData = {}) {
  // --- DEV/STUB DETECTION ----------------------------------------
  const host      = location.hostname;
  const port      = location.port;
  const origin    = location.origin;
  const hasApiBase = !!window.API_BASE;

  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0";

  // If we're on a static dev server (no API_BASE, usually port 8080),
  // we DO NOT try to POST anywhere – we just return a fake challenge.
  const isStaticDev = !hasApiBase && (isLocalHost || port === "8080");

  if (isStaticDev) {
    console.log(
      "[ai] DEV stub active — no network POST. Origin:",
      origin,
      "payload:",
      contextData
    );

    // Use the rich mock so we exercise all step types locally
    return mockAiResponse({
      ...contextData,
      mode: contextData.mode || "practice",
    });
  }

  // --- REAL BACKEND PATH (production / when API_BASE is set) -----
  const token = window.JWT_TOKEN;

  // If there is no token (guest / not logged in), fall back to mock
  // so the UI still works, but the real AI remains login-gated.
  if (!token) {
    console.warn("[ai] No JWT token present — using local mock challenge instead.");
    return mockAiResponse(contextData);
  }

  const baseUrl = window.API_BASE || "/api"; // on prod, API_BASE is set
  const url = `${baseUrl}/game/ai/challenge`;

  console.log("🚀 Sending AI Request:", { url, contextData });

  try {
    const state = _appInterface?.state || {};
    const payload = Object.assign({}, contextData, {
      step_result: contextData.step_result ?? state.lastAiStepResult ?? null,
      objective_id: contextData.objective_id ?? state.aiSession?.objectiveId ?? null,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI Server Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data; // { question, answer, hint, ... } or step-style payload

  } catch (error) {
    console.error("[AI Proxy] Error, falling back to mock:", error);
    return mockAiResponse(contextData);
  }
}

/**
 * Local/offline mock generator.
 * Returns objects in the same "step" shape the frontend expects
 * (mode, prompt/question, options, answer/correct, hint, media, manipulatives).
 */
function mockAiResponse(contextData = {}) {
  const { subject = "maths", mode = "practice" } = contextData;

  // Simple English stub
  if (subject === "english") {
    return {
      mode: "fillBlank",
      story:
        mode === "placement"
          ? "Write a short sentence about your favourite animal."
          : "Tell a quick story about a trip to the park.",
      hint: "Use a capital letter and a full stop.",
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
      manipulatives: null,
    };
  }

  // Maths mocks
  const easyNums = [
    { a: 3, b: 4 },
    { a: 6, b: 2 },
    { a: 5, b: 5 },
    { a: 8, b: 3 },
    { a: 9, b: 1 },
    { a: 7, b: 4 },
  ];
  const pick = easyNums[Math.floor(Math.random() * easyNums.length)];
  const sum = pick.a + pick.b;
  const mediaSample = Math.random() > 0.5;

  // Placement sometimes returns a fillBlank + manipulatives
  if (mode === "placement" && Math.random() > 0.5) {
    return {
      mode: "fillBlank",
      prompt: "___ + 4 = 10",
      correct: 6,
      hint: "Think: 4 + ? = 10",
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
      manipulatives: {
        kind: "tenFrames",
        frames: [{ filled: 4 }, { filled: 2 }],
      },
    };
  }

  // Default: multiChoice word problem
  const options = [
    String(sum),
    String(sum + 1),
    String(sum - 1),
    String(sum + 2),
  ].sort(() => Math.random() - 0.5);

  return {
    mode: "multiChoice",
    question:
      mode === "placement"
        ? `What is ${pick.a} + ${pick.b}?`
        : `If you have ${pick.a} stickers and get ${pick.b} more, how many stickers do you have now?`,
    options,
    answer: sum,
    hint: "Add the two numbers together.",
    audioUrl: null,
    imageUrl: mediaSample ? "/media/images/example-numberline-0-30.png" : null,
    imageAlt: mediaSample
      ? "A number line from 0 to 30 with tick marks."
      : null,
    manipulatives: mediaSample
      ? {
          kind: "numberLine",
          min: 0,
          max: 30,
          highlight: [sum],
        }
      : null,
  };
}
