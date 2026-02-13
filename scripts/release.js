#!/usr/bin/env node

/**
 * Release script — bumps version and creates a git tag
 *
 * Usage:
 *   node scripts/release.js patch   # 1.0.0 → 1.0.1
 *   node scripts/release.js minor   # 1.0.0 → 1.1.0
 *   node scripts/release.js major   # 1.0.0 → 2.0.0
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const bumpType = process.argv[2];

if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error("Usage: node scripts/release.js [patch|minor|major]");
  process.exit(1);
}

// Read current version from app.config.ts
const configPath = path.join(__dirname, "..", "app.config.ts");
const configContent = fs.readFileSync(configPath, "utf-8");

const versionMatch = configContent.match(/version:\s*"(\d+)\.(\d+)\.(\d+)"/);
if (!versionMatch) {
  console.error("Could not find version in app.config.ts");
  process.exit(1);
}

let [, major, minor, patch] = versionMatch.map(Number);

switch (bumpType) {
  case "major":
    major++;
    minor = 0;
    patch = 0;
    break;
  case "minor":
    minor++;
    patch = 0;
    break;
  case "patch":
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;

// Update app.config.ts
const updatedConfig = configContent.replace(
  /version:\s*"\d+\.\d+\.\d+"/,
  `version: "${newVersion}"`
);
fs.writeFileSync(configPath, updatedConfig);

// Update package.json
const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`\n📦 Version bumped to ${newVersion}\n`);

// Git commit and tag
try {
  execSync("git add app.config.ts package.json", { stdio: "inherit" });
  execSync(`git commit -m "chore: release v${newVersion}"`, {
    stdio: "inherit",
  });
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, {
    stdio: "inherit",
  });
  console.log(`\n🏷️  Tagged v${newVersion}`);
  console.log(`\nTo push: git push origin main --tags\n`);
} catch (error) {
  console.error("Git operations failed:", error.message);
  process.exit(1);
}
