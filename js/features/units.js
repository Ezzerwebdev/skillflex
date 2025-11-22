// [2024-11-21] Added AI Placement Wizard integration; removed manual level UI.
/**
 * SkillFlex Units / Learning Path
 * Combined subject + year selector, with topic nodes.
 * Internally bridges into the existing Challenge Modal via window.launchUnitAI.
 */

/* ------------------ CURRICULUM MAP (Maths Y1–Y6) ------------------ */
/* You can extend this with english:{...} later. */

console.log('[units.js] loaded SkillFlex Units / Learning Path');


const CURRICULUM_MAP = {
  maths: {
    1: [
      {
        id: "m1-counting",
        topic: "counting",
        title: "Counting & Number",
        desc: "Counting objects, reading and writing numbers to 100.",
        icon: "🔢",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m1-place-value",
        topic: "place-value",
        title: "Early Place Value",
        desc: "Tens and ones, more/less, number lines.",
        icon: "📊",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m1-add-sub",
        topic: "addition-subtraction",
        title: "Addition & Subtraction",
        desc: "Number bonds and simple stories within 20.",
        icon: "➕",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m1-measure",
        topic: "measurement",
        title: "Measurement",
        desc: "Length, mass and time using everyday language.",
        icon: "📏",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m1-shape",
        topic: "shape",
        title: "Shapes",
        desc: "2D and 3D shapes in different positions.",
        icon: "🔺",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m1-position",
        topic: "position-direction",
        title: "Position & Direction",
        desc: "Over, under, left, right and simple turns.",
        icon: "🧭",
        aiEnabled: false,
        status: "coming-soon"
      }
    ],
    2: [
      {
        id: "m2-place-value",
        topic: "place-value",
        title: "Place Value",
        desc: "Numbers to 100, tens and ones, comparing and ordering.",
        icon: "🔢",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-add-sub",
        topic: "addition-subtraction",
        title: "Addition & Subtraction",
        desc: "Using known facts and written methods within 100.",
        icon: "➕",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-mult-div",
        topic: "multiplication-division",
        title: "Multiplication & Division",
        desc: "2, 5 and 10 times tables, sharing and grouping.",
        icon: "✖️",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-fractions",
        topic: "fractions",
        title: "Fractions",
        desc: "Halves, quarters and thirds of shapes and amounts.",
        icon: "🍰",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-measure",
        topic: "measurement",
        title: "Measurement & Money",
        desc: "Length, mass, capacity, coins and notes.",
        icon: "💰",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-shape",
        topic: "shape",
        title: "Shape & Patterns",
        desc: "2D/3D shapes and symmetry.",
        icon: "🧩",
        aiEnabled: false,
        status: "coming-soon"
      },
      {
        id: "m2-statistics",
        topic: "statistics",
        title: "Simple Data",
        desc: "Picture graphs and simple tables.",
        icon: "📈",
        aiEnabled: false,
        status: "coming-soon"
      }
    ],
    3: [
      {
        id: "m3-place-value",
        topic: "place-value",
        title: "Place Value",
        desc: "Numbers to 1,000, number lines and rounding.",
        icon: "🔢",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-add-sub",
        topic: "addition-subtraction",
        title: "Addition & Subtraction",
        desc: "Formal written methods and problem solving.",
        icon: "➕",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-mult-div",
        topic: "multiplication-division",
        title: "Multiplication & Division",
        desc: "3, 4 and 8 times tables and related facts.",
        icon: "✖️",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-fractions",
        topic: "fractions",
        title: "Fractions",
        desc: "Unit and non-unit fractions, fractions of amounts.",
        icon: "🍰",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-measure",
        topic: "measurement",
        title: "Measurement",
        desc: "Length, perimeter, mass and volume.",
        icon: "📏",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-shape",
        topic: "shape",
        title: "Shape",
        desc: "Angles, 2D shapes and 3D shapes.",
        icon: "🔺",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m3-statistics",
        topic: "statistics",
        title: "Statistics",
        desc: "Bar charts and tables.",
        icon: "📊",
        aiEnabled: true,
        status: "available"
      }
    ],
    4: [
      {
        id: "m4-place-value",
        topic: "place-value",
        title: "Place Value",
        desc: "Numbers to 10,000, rounding and negative numbers.",
        icon: "🔢",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-add-sub",
        topic: "addition-subtraction",
        title: "Addition & Subtraction",
        desc: "Efficient written methods and multi-step problems.",
        icon: "➕",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-mult-div",
        topic: "multiplication-division",
        title: "Multiplication & Division",
        desc: "All times tables up to 12×12 and related problems.",
        icon: "✖️",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-fractions",
        topic: "fractions",
        title: "Fractions & Decimals",
        desc: "Equivalent fractions, tenths and hundredths.",
        icon: "🍰",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-measure",
        topic: "measurement",
        title: "Measurement",
        desc: "Area, perimeter and conversions.",
        icon: "📐",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-shape",
        topic: "shape",
        title: "Shape & Position",
        desc: "Triangles, quadrilaterals and coordinates.",
        icon: "🧭",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m4-statistics",
        topic: "statistics",
        title: "Statistics",
        desc: "Line graphs and data interpretation.",
        icon: "📊",
        aiEnabled: true,
        status: "available"
      }
    ],
    5: [
      {
        id: "m5-place-value",
        topic: "place-value",
        title: "Place Value",
        desc: "Numbers to 1,000,000 and powers of 10.",
        icon: "🔢",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-add-sub",
        topic: "addition-subtraction",
        title: "Addition & Subtraction",
        desc: "Multi-step calculations in context.",
        icon: "➕",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-mult-div",
        topic: "multiplication-division",
        title: "Multiplication & Division",
        desc: "Long multiplication and division strategies.",
        icon: "✖️",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-fdp",
        topic: "fractions-decimals-percentages",
        title: "Fractions, Decimals & Percentages",
        desc: "Comparing, converting and problem solving.",
        icon: "🍰",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-measure",
        topic: "measurement",
        title: "Measurement",
        desc: "Perimeter, area and volume.",
        icon: "📐",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-shape",
        topic: "shape",
        title: "Shape & Angles",
        desc: "Regular polygons, angles and reflection.",
        icon: "📐",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m5-statistics",
        topic: "statistics",
        title: "Statistics",
        desc: "Timetables and more complex graphs.",
        icon: "📊",
        aiEnabled: true,
        status: "available"
      }
    ],
    6: [
      {
        id: "m6-place-value",
        topic: "place-value",
        title: "Place Value",
        desc: "Numbers to 10,000,000 and rounding.",
        icon: "🔢",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-four-ops",
        topic: "four-operations",
        title: "Four Operations",
        desc: "Fluent use of all operations in multi-step problems.",
        icon: "➕",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-fdp",
        topic: "fractions-decimals-percentages",
        title: "Fractions, Decimals & Percentages",
        desc: "Calculations and equivalences across FDP.",
        icon: "🍰",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-ratio",
        topic: "ratio-proportion",
        title: "Ratio & Proportion",
        desc: "Comparing quantities and scaling problems.",
        icon: "⚖️",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-algebra",
        topic: "algebra",
        title: "Algebra",
        desc: "Simple formulae, sequences and unknowns.",
        icon: "🧮",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-measure",
        topic: "measurement",
        title: "Measurement",
        desc: "Area, volume and metric conversions.",
        icon: "📏",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-shape",
        topic: "shape",
        title: "Shape & Position",
        desc: "Properties of shapes, coordinates and translation.",
        icon: "🔺",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "m6-statistics",
        topic: "statistics",
        title: "Statistics",
        desc: "Pie charts and calculating averages.",
        icon: "📊",
        aiEnabled: true,
        status: "available"
      }
    ]
  },

  // Placeholder – you can fill this once you have English progression mapped.
  english: {
    3: [
      {
        id: "e3-reading",
        topic: "reading",
        title: "Reading Skills",
        desc: "Retrieval, inference and prediction.",
        icon: "📖",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "e3-writing",
        topic: "writing",
        title: "Writing",
        desc: "Narratives and descriptions.",
        icon: "✍️",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "e3-grammar",
        topic: "grammar",
        title: "Grammar & Punctuation",
        desc: "Sentence types and punctuation marks.",
        icon: "📘",
        aiEnabled: true,
        status: "available"
      },
      {
        id: "e3-spelling",
        topic: "spelling",
        title: "Spelling",
        desc: "Common patterns and rules.",
        icon: "🔡",
        aiEnabled: true,
        status: "available"
      }
    ]
    // Add 4,5,6 when you're ready
  }
};

/* --------------------------- Helpers --------------------------- */

function safeFeedback(msg) {
  try {
    if (typeof window.safeFeedback === "function") return window.safeFeedback(msg, false);
    if (typeof window.toast === "function") return window.toast(msg);
  } catch (e) {
    // ignore
  }
  console.log(msg);
}

function getDefaultSubject() {
  const sel = window.state?.selections;
  if (sel?.subject && CURRICULUM_MAP[sel.subject]) return sel.subject;
  return "maths";
}

function getDefaultYear(subject) {
  const sel = window.state?.selections;
  const yr = Number(sel?.year || 0);
  if (yr && CURRICULUM_MAP[subject] && CURRICULUM_MAP[subject][yr]) return yr;
  return 3;
}

/* --------------------- Main View Renderer ---------------------- */

export function renderUnitsView(container) {
  console.log('[units.js] renderUnitsView init, container =', container);

  // Mark body as "units" mode so CSS can tweak layout just for this view
 
  const rootSel = window.state?.selections || {};
  const profile = window.state?.skillProfile || {};
  const defaultSubject = getDefaultSubject();
  const defaultYear = getDefaultYear(defaultSubject);
  const subjectKey = rootSel.subject || defaultSubject;
  const defaultLevel =
    profile[subjectKey]?.baselineLevel ||
    rootSel.level ||
    'core';
  const state = {
    subject: subjectKey,
    year: defaultYear,
    level: defaultLevel
  };

  function syncSelections() {
    try {
      if (!window.state) window.state = {};
      if (!window.state.selections) window.state.selections = {};
      window.state.selections.subject = state.subject;
      window.state.selections.year = state.year;
      window.state.selections.level = state.level;
      if (typeof window.saveSelections === 'function') {
        window.saveSelections();
      }
    } catch {}
  }

  

  function render() {
    const liveProfile = window.state?.skillProfile || {};
    state.level = liveProfile[state.subject]?.baselineLevel || state.level || 'core';
    syncSelections();
    const subjectMap = CURRICULUM_MAP[state.subject] || {};
    const units = subjectMap[state.year] || [];

    const subjectLabel = state.subject === "maths" ? "Maths" : "English";
    const streak = Number(
    window.state?.streak ?? window.state?.streakDays ?? 0
     );
     const coins = Number(
    window.state?.coins ?? window.state?.xp ?? 0
    );
        const subjectSelectHtml = `
      <div id="units-subject-select" class="units-subject-select">
        <button type="button"
                class="subject-pill${state.subject === "maths" ? " active" : ""}"
                data-subject="maths">
          ➗ Maths
        </button>
        <button type="button"
                class="subject-pill${state.subject === "english" ? " active" : ""}"
                data-subject="english">
          📚 English
        </button>
      </div>
    `;


    const years = [1, 2, 3, 4, 5, 6];
    const yearTabsHtml = years
      .map((y) => {
        const active = y === state.year ? " active" : "";
        return `<button class="units-year-tab${active}" data-year="${y}">Y${y}</button>`;
      })
      .join("");

    const nodesHtml = units
  .map((u) => {
    const locked = !u.aiEnabled;
    let badge = "";
    if (!u.aiEnabled) {
      badge = `<span class="unit-badge coming">Coming soon</span>`;
    } else if (u.status === "available") {
      badge = `<span class="unit-badge">Tap to start</span>`;
    }

    const s = state.subject;
    const y = state.year;
    const t = u.topic;

    const classes = `unit-node${locked ? " locked" : ""}`;

    return `
      <div class="${classes}"
           data-subject="${s}"
           data-year="${y}"
           data-topic="${t}">
        ${badge}
        <div class="unit-inner">
          <span class="unit-icon">${u.icon}</span>
          <div class="unit-title">${u.title}</div>
          <div class="unit-desc">${u.desc}</div>
        </div>
      </div>
    `;
  })
  .join("");


    container.innerHTML = `
  <div class="units-view">
    <header class="units-header">
      <div class="units-header-main">
        <div class="units-header-left">
          <button type="button" id="units-back-btn" class="units-back-btn units-back-link">
            ← Back to overview
          </button>
          <span class="header-pill">🌱 Your learning path</span>
          <h1>Learning Path</h1>
          <p>Choose a subject and year, then pick a topic to start a challenge.</p>
          <div class="units-controls">
            ${subjectSelectHtml}
            <div class="units-year-tabs">
              ${yearTabsHtml}
            </div>
          </div>
          <p style="margin-top:0.4rem;font-size:0.8rem;color:#94a3b8;">
            ${subjectLabel} · Year ${state.year}
          </p>
        </div>
        <div class="units-header-right">
          <div class="units-stats" aria-live="polite">
            <div class="units-stats-pill">
              <span class="text-lg">🔥</span>
              <span class="units-stat-num">${streak}</span>
            </div>
            <div class="units-stats-pill">
              <span class="text-lg">🪙</span>
              <span class="units-stat-num">${coins}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
    <div class="learning-path">
      ${nodesHtml || `<p style="color:#94a3b8;font-size:0.9rem;">No topics added yet for this track.</p>`}
    </div>
  </div>
`;
    
      // Back button
    const backBtn = container.querySelector('#units-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = '/profile?tab=overview';
      });
    }

    // Wire up controls
    const subjSel = container.querySelector("#units-subject-select");
     if (subjSel) {
      subjSel.querySelectorAll(".subject-pill").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const value = e.currentTarget.getAttribute("data-subject");
          if (!value || !CURRICULUM_MAP[value]) return;

          state.subject = value;
          state.level =
            (profile[value]?.baselineLevel) ||
            (window.state?.skillProfile?.[value]?.baselineLevel) ||
            "core";

          // reset year if that subject doesn’t have the current year
          const subjYears = CURRICULUM_MAP[value];
          if (!subjYears[state.year]) {
            const keys = Object.keys(subjYears)
              .map((n) => Number(n))
              .sort((a, b) => a - b);
            state.year = keys[0] || 3;
          }

          syncSelections();
          render();
        });
      });
    }


    // Year tab clicks → re-render
    container.querySelectorAll(".units-year-tab").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const y = Number(e.currentTarget.getAttribute("data-year") || "0");
        if (!y) return;
        state.year = y;
        syncSelections();
        render();
      });
    });

    // ⬇️ NEW: unit card clicks → call launchUnitAI (CSP-safe)
    container.querySelectorAll('.unit-node[data-topic]').forEach((node) => {
      node.addEventListener('click', () => {
        const subj = node.getAttribute('data-subject') || '';
        const yearStr = node.getAttribute('data-year') || '0';
        const topic = node.getAttribute('data-topic') || '';
        const year = Number(yearStr) || 0;
        console.log('[units.js] card clicked', { subj, year, topic, hasLaunchUnitAI: typeof window.launchUnitAI });

        if (typeof window.launchUnitAI === 'function') {
          window.launchUnitAI(subj, year, topic);
        } else {
          console.error('window.launchUnitAI is not defined');
        }
      });
    });
  }

  render();
}


/* ------------------- Global Bridge: launchUnitAI ------------------- */
/* NOTE: UI never mentions "AI" – this just quietly opens your existing modal. */

window.launchUnitAI = async function (subject, year, topic) {
  console.log('[units.js] launchUnitAI', { subject, year, topic });
  // Look up unit to check aiEnabled
  const subjectMap = CURRICULUM_MAP[subject] || {};
  const units = subjectMap[year] || [];
  const unit = units.find((u) => u.topic === topic);

  if (unit && unit.aiEnabled === false) {
    safeFeedback("Interactive challenges for this year group are coming soon.");
    return;
  }

  // Update global state selections
  try {
    if (!window.state) window.state = {};
    if (!window.state.selections) window.state.selections = {};
    const profile = window.state.skillProfile || {};
    const baselineLevel = profile[subject]?.baselineLevel || 'core';
    window.state.selections.subject = subject;
    window.state.selections.year = year;
    window.state.selections.topic = topic;
    window.state.selections.level = baselineLevel;
  } catch (e) {
    // non-fatal
  }

  try {
    const sel = window.state.selections || {};
    const profile = window.state.skillProfile || {};
    const baselineLevel = profile[subject]?.baselineLevel || 'core';
    window.state.aiSession = {
      topic,
      level: baselineLevel,
      difficulty: baselineLevel,
      total: 5,
      asked: 0,
      correct: 0
    };
  } catch (e) { /* ignore */ }

  // Try to pre-fill any subject/year/topic dropdowns in your modal.
  // Maths (existing IDs from earlier design)
  if (subject === "maths") {
    const topicSel = document.getElementById("mathTopic");
    const yearSel = document.getElementById("mathYear");
    if (topicSel) {
      let exists = false;
      for (let i = 0; i < topicSel.options.length; i++) {
        if (topicSel.options[i].value === topic) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        const opt = document.createElement("option");
        opt.value = topic;
        opt.textContent = topic
          .replace(/[-_]+/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase());
        topicSel.add(opt);
      }
      topicSel.value = topic;
    }
    if (yearSel) {
      yearSel.value = String(year);
    }
  }

  // (Optional) English modal elements if you add them later:
  if (subject === "english") {
    const topicSel =
      document.getElementById("engTopic") ||
      document.getElementById("englishTopic");
    const yearSel =
      document.getElementById("engYear") ||
      document.getElementById("englishYear");
    if (topicSel) {
      let exists = false;
      for (let i = 0; i < topicSel.options.length; i++) {
        if (topicSel.options[i].value === topic) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        const opt = document.createElement("option");
        opt.value = topic;
        opt.textContent = topic
          .replace(/[-_]+/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase());
        topicSel.add(opt);
      }
      topicSel.value = topic;
    }
    if (yearSel) {
      yearSel.value = String(year);
    }
  }

  // Trigger your existing challenge modal (no "AI" wording here, just internal call)
  if (typeof window.launchAI === "function") {
    if (typeof window.ensurePlacementBeforeAI === 'function') {
      await window.ensurePlacementBeforeAI(subject, year);
    }
    window.launchAI();
  } else {
    console.error("launchAI function missing from window scope");
    safeFeedback("System is still loading. Please try again in a moment.");
  }
};
