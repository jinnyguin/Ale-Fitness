const assert = require("node:assert/strict");
const fs = require("node:fs");

const callbackHtml = fs.readFileSync("OAuthCallback.html", "utf8");
const todayHtml = fs.readFileSync("today.html", "utf8");
const dashboardCss = fs.readFileSync("today-dashboard.css", "utf8");

assert.match(callbackHtml, /<img class="brand" src="\/images\/alefit-logo\.png" alt="ALEFIT"/);
assert.match(callbackHtml, /background:[\s\S]*#080a08/);
assert.match(callbackHtml, /border-top-color:\s*#d4ff00/i);
assert.doesNotMatch(callbackHtml, /#0f172a|#3b82f6|#60a5fa/i);
assert.match(
  todayHtml,
  /<span class="coach-loading-core"><img src="\/images\/alefit-logo\.png" alt=""><\/span>/,
);
assert.match(dashboardCss, /\.coach-loading-core img\s*\{/);

console.log("ALEFIT sign-in and coaching loaders use the branded logo and color palette.");
