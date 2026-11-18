import type { PluginToolContext } from "@cotree/plugin-sdk";
import { file, good, object, relative, strings, text, type ObjectValue } from "./shared.js";

export async function delivery(input: ObjectValue, context: PluginToolContext) {
  const root = relative(input.projectPath), taskRefs = strings(input.taskRefs ?? [], "taskRefs", 24);
  const observations = [];
  for (const ref of taskRefs) observations.push((await context.tasks.read(ref)).task);
  const assessment = object(input.assessment, "assessment");
  text(assessment.summary, "assessment.summary", 8000);
  const remaining = strings(assessment.remaining ?? [], "assessment.remaining", 64);
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), projectPath: root,
    authorAssessment: { ...assessment, attribution: "Coordinator assessment, not an independent certificate", remaining },
    hostTaskObservations: observations,
    evidenceLimitations: taskRefs.length ? "Only these original Task records were read. Scope and code identity must be assessed from their artifacts." : "No host Task evidence was supplied; this report does not claim tests ran.",
    runtimeStateAuthority: "Original CoTree Session/Task/Process records; this file is a delivery snapshot." };
  const jsonPath = file(root, "docs/product/delivery.json"), markdownPath = file(root, "docs/product/delivery.md");
  const content = `# Application delivery\n\n${assessment.summary}\n\n## Evidence\n\n${observations.map(task => `- ${task.taskRef}: ${task.state}; execution settled: ${task.executionSettled === true}`).join("\n") || "No original Task evidence supplied."}\n\n## Remaining work\n\n${remaining.map(item => `- ${item}`).join("\n") || "The coordinator reported no remaining work; assess this against the recorded scope and evidence."}\n\nSee delivery.json for the exact observations and their limits.\n`;
  await context.files.write(jsonPath, JSON.stringify(report, null, 2) + "\n");
  await context.files.write(markdownPath, content);
  const artifact = await context.artifacts.create({ type: "json", content: JSON.stringify(report), summary: "App Studio versioned delivery snapshot" });
  return good({ paths: [jsonPath, markdownPath], report, artifact: artifact.artifact });
}
