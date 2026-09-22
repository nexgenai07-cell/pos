#!/usr/bin/env node
/**
 * Guards against reintroducing physical-direction Tailwind utilities.
 *
 * Tailwind's ml-/mr-/pl-/pr-/left-/right-/border-l-/border-r-/text-left/
 * text-right utilities are *physical* — they don't mirror when the layout flips
 * to RTL, which is how an Arabic UI ends up with icons and gutters on the wrong
 * side. The logical equivalents (ms-/me-/ps-/pe-/start-/end-/border-s-/
 * border-e-/text-start/text-end) do mirror automatically.
 *
 * Run: npm run check:rtl
 *
 * Opt a line out with an `rtl-ok` comment when a physical value is genuinely
 * intended (e.g. a deliberate off-canvas offset handled in JS).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_DIR = join(process.cwd(), "src");
const EXTENSIONS = [".ts", ".tsx", ".css"];

const RULES = [
  { label: "physical margin/padding", pattern: /\b(ml|mr|pl|pr)-\d/ },
  { label: "physical inset", pattern: /\b(left|right)-\d/ },
  { label: "physical text align", pattern: /\btext-(left|right)\b/ },
  { label: "physical border side", pattern: /\bborder-(l|r)-/ },
];

function collectFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectFiles(full));
    else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) found.push(full);
  }
  return found;
}

const violations = [];

for (const file of collectFiles(SRC_DIR)) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("rtl-ok")) return;
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relative(process.cwd(), file),
          line: index + 1,
          label: rule.label,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log("check:rtl — clean. No physical-direction utilities found.");
  process.exit(0);
}

console.error(`check:rtl — ${violations.length} physical-direction utility usage(s) found:\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.label}]\n    ${v.text}`);
}
console.error(
  "\nUse the logical equivalent (ms-/me-/ps-/pe-/start-/end-/border-s-/border-e-/text-start/text-end),\n" +
    "or add an `rtl-ok` comment on the line if the physical value is intentional."
);
process.exit(1);
