const scenarios = {
  rag: {
    title: "Confidential knowledge assistant",
    shortTitle: "CONFIDENTIAL RAG",
    pattern: "RAG service + governed retrieval boundary",
    critical: "Entitlement propagation and source provenance",
    controls: "Identity propagation, source entitlements, prompt/data filtering and refusal",
    evaluation: "Groundedness, retrieval quality, refusal and citation tests",
    observability: "Latency, retrieval misses, answer quality and access denials",
    authority: "Human verifies consequential answers",
    owner: "Named service owner with incident and pattern-evolution authority",
    nextAction: "Promote the pattern after production evidence confirms quality and ownership.",
    decision: "PERMIT",
    failedLayers: []
  },
  agent: {
    title: "Agentic transaction workflow",
    shortTitle: "AGENTIC ACTION",
    pattern: "Tool-using agent behind an explicit action gateway",
    critical: "Approval thresholds, idempotency, rollback and stop authority",
    controls: "Least privilege, action policy, approval thresholds, idempotency and rollback",
    evaluation: "Task success, policy conformance, tool misuse and recovery tests",
    observability: "Every plan, tool call, approval, state change and rollback",
    authority: "Human approves irreversible or material actions",
    owner: "Service and business owners share incident, action-policy and exception authority",
    nextAction: "Resolve the human-authority and production-ownership contract before broad release.",
    decision: "CONDITIONAL",
    failedLayers: ["authority", "ownership"]
  },
  doc: {
    title: "Regulated document intelligence",
    shortTitle: "REGULATED DOCUMENT",
    pattern: "Document ingestion + extraction + evidence-retention pipeline",
    critical: "Lineage, exception recall, retention and record-of-decision",
    controls: "Data lineage, retention, redaction and record-of-decision",
    evaluation: "Extraction accuracy, exception recall and drift by document class",
    observability: "Version, confidence, exception and reviewer outcomes",
    authority: "Human owns low-confidence and regulated exceptions",
    owner: "Named process owner governs document classes, exceptions and evidence retention",
    nextAction: "Permit with explicit exception sampling and periodic drift review by document class.",
    decision: "PERMIT",
    failedLayers: []
  },
  rush: {
    title: "Prototype rushed toward production",
    shortTitle: "PROTOTYPE RUSH",
    pattern: "No stable reference pattern selected",
    critical: "Identity, evaluation, observability, authority and ownership are unresolved",
    controls: "Unresolved identity, data and exception boundaries",
    evaluation: "No agreed acceptance suite or regression baseline",
    observability: "Demo telemetry only; production evidence absent",
    authority: "Approval, exception, rollback and stop authority are unclear",
    owner: "No accountable production owner or service-level commitment",
    nextAction: "Hold production release. Assign ownership and complete the missing control and evidence layers.",
    decision: "HOLD",
    failedLayers: ["identity", "evaluation", "observability", "authority", "ownership"]
  }
};

let currentScenario = "rag";
let testTimers = [];
const layerOrder = ["outcome", "pattern", "data", "identity", "evaluation", "observability", "authority", "ownership"];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function clearTestTimers() {
  testTimers.forEach(window.clearTimeout);
  testTimers = [];
}

function decisionClass(decision) {
  return decision.toLowerCase().replace(/\s+/g, "-");
}

function setText(field, value) {
  document.querySelectorAll(`[data-field="${field}"]`).forEach((element) => {
    element.textContent = value;
  });
}

function syncScenarioControls(key) {
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === key));
  });
}

function resetLoadTest() {
  clearTestTimers();
  document.querySelectorAll("[data-load-layer]").forEach((layer) => {
    layer.classList.remove("engaged", "failed");
    const state = layer.querySelector(".layer-state");
    if (state) state.textContent = "WAIT";
  });
  document.querySelectorAll("[data-load-test]").forEach((test) => {
    test.classList.remove("test-complete", "permit", "conditional", "hold");
  });
  document.querySelectorAll("[data-progress]").forEach((progress) => {
    progress.textContent = `0 / ${layerOrder.length}`;
  });
}

function finalizeLoadTest(scenario) {
  document.querySelectorAll("[data-load-test]").forEach((test) => {
    test.classList.add("test-complete", decisionClass(scenario.decision));
  });
}

function runLoadTest() {
  const scenario = scenarios[currentScenario];
  if (!scenario) return;
  resetLoadTest();
  const layers = layerOrder
    .map((name) => document.querySelector(`[data-load-layer="${name}"]`))
    .filter(Boolean);

  const engageLayer = (layer, index) => {
    const name = layer.dataset.loadLayer;
    const failed = scenario.failedLayers.includes(name);
    layer.classList.add("engaged");
    if (failed) layer.classList.add("failed");
    const state = layer.querySelector(".layer-state");
    if (state) state.textContent = failed ? "GAP" : "BOUND";
    document.querySelectorAll("[data-progress]").forEach((progress) => {
      progress.textContent = `${index + 1} / ${layerOrder.length}`;
    });
  };

  if (reduceMotion.matches) {
    layers.forEach(engageLayer);
    finalizeLoadTest(scenario);
    return;
  }

  layers.forEach((layer, index) => {
    testTimers.push(window.setTimeout(() => engageLayer(layer, index), 220 + index * 330));
  });
  testTimers.push(window.setTimeout(
    () => finalizeLoadTest(scenario),
    220 + layers.length * 330 + 220
  ));
}

function setScenario(key, options = {}) {
  const scenario = scenarios[key];
  if (!scenario) return;
  currentScenario = key;
  syncScenarioControls(key);
  ["title", "shortTitle", "pattern", "critical", "controls", "evaluation", "observability", "authority", "owner", "nextAction"].forEach((field) => {
    setText(field, scenario[field]);
  });
  document.querySelectorAll("[data-decision]").forEach((element) => {
    element.textContent = scenario.decision;
    element.dataset.state = decisionClass(scenario.decision);
  });
  if (options.run !== false) runLoadTest();
  document.dispatchEvent(new CustomEvent("architecture-scenario", { detail: key }));
}

async function hydrateFragment(element, url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
  element.innerHTML = await response.text();
}

async function loadDynamicContent() {
  const tasks = [];
  document.querySelectorAll("[data-home-fragment]").forEach((element) => {
    tasks.push(hydrateFragment(element, element.dataset.homeFragment));
  });
  const loadShell = document.querySelector("[data-load-svg]");
  if (loadShell) tasks.push(hydrateFragment(loadShell, "assets/load-test.svg"));
  await Promise.all(tasks);
}

function bindScenarioControls() {
  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => setScenario(button.dataset.scenario));
  });
  document.querySelectorAll("[data-replay-test]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("[data-load-test]")?.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "center"
      });
      runLoadTest();
    });
  });
}

function bindNavigation() {
  const menuToggle = document.querySelector(".menu-toggle");
  const campaignNav = document.querySelector("#campaign-nav");
  if (!menuToggle || !campaignNav) return;
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    campaignNav.classList.toggle("is-open", !expanded);
  });
  campaignNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      campaignNav.classList.remove("is-open");
    }
  });
}

function bindRevealMotion() {
  const observed = document.querySelectorAll(
    ".code-articles article, .career-timeline article, .inspection-row, .entry-schedule article"
  );
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      });
    }, { threshold: 0.18 });
    observed.forEach((element) => observer.observe(element));
  } else {
    observed.forEach((element) => element.classList.add("in-view"));
  }
}

async function initializeCampaign() {
  try {
    await loadDynamicContent();
  } catch (error) {
    console.error(error);
    document.querySelectorAll(".home-sections-loading, .diagram-loading").forEach((element) => {
      element.textContent = "This campaign section could not be loaded. Please refresh the page.";
    });
  }
  bindScenarioControls();
  bindNavigation();
  bindRevealMotion();
  reduceMotion.addEventListener?.("change", () => runLoadTest());
  setScenario("rag");
}

initializeCampaign();
