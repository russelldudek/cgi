const scenarios = {
  rag: { title: "Confidential knowledge assistant", pattern: "RAG service + governed retrieval boundary", controls: "Identity propagation, source entitlements, prompt/data filtering", evaluation: "Groundedness, retrieval quality, refusal and citation tests", observability: "Latency, retrieval misses, answer quality, access denials", authority: "Human verifies consequential answers", decision: "PERMIT", stress: "" },
  agent: { title: "Agentic transaction workflow", pattern: "Tool-using agent behind an explicit action gateway", controls: "Least privilege, approval thresholds, idempotency, rollback", evaluation: "Task success, policy conformance, tool misuse and recovery tests", observability: "Every plan, tool call, approval, state change and rollback", authority: "Human approves irreversible or material actions", decision: "CONDITIONAL", stress: "stress-authority" },
  doc: { title: "Regulated document intelligence", pattern: "Document ingestion + extraction + evidence-retention pipeline", controls: "Data lineage, retention, redaction and record-of-decision", evaluation: "Extraction accuracy, exception recall, drift by document class", observability: "Version, confidence, exception and reviewer outcomes", authority: "Human owns low-confidence and regulated exceptions", decision: "PERMIT", stress: "stress-eval" },
  rush: { title: "Prototype rushed toward production", pattern: "No stable reference pattern selected", controls: "Unresolved identity, data and exception boundaries", evaluation: "No agreed acceptance suite or regression baseline", observability: "Demo telemetry only; production evidence absent", authority: "Ownership and stop authority unclear", decision: "HOLD", stress: "stress-hold stress-identity stress-observe" }
};

function setScenario(key) {
  const scenario = scenarios[key];
  if (!scenario) return;
  document.querySelectorAll(".scenario-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === key));
  });
  ["title", "pattern", "controls", "evaluation", "observability", "authority"].forEach((field) => {
    document.querySelectorAll(`[data-field="${field}"]`).forEach((element) => {
      element.textContent = scenario[field];
    });
  });
  document.querySelectorAll(".architect-figure").forEach((figure) => {
    figure.className = `architect-figure ${scenario.stress}`.trim();
  });
  document.querySelectorAll("[data-decision]").forEach((element) => {
    element.textContent = scenario.decision;
    element.className = `permit-chip ${scenario.decision === "CONDITIONAL" ? "conditional" : scenario.decision === "HOLD" ? "hold" : ""}`.trim();
  });
  document.dispatchEvent(new CustomEvent("architecture-scenario", { detail: key }));
}

document.querySelectorAll(".scenario-button").forEach((button) => {
  button.addEventListener("click", () => setScenario(button.dataset.scenario));
});
if (document.querySelector(".scenario-button")) setScenario("rag");
