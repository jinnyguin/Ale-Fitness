(function (root) {
  "use strict";
  var query = new URLSearchParams(root.location.search || "");
  var hash = new URLSearchParams((root.location.hash || "").replace(/^#/, ""));

  function readPending(storageName, key, timestampName, maxAge) {
    try {
      var storage = root[storageName];
      var pending = JSON.parse(storage && storage.getItem(key) || "null");
      if (!pending || typeof pending.verifier !== "string" ||
          !/^[A-Za-z0-9._~-]{43,128}$/.test(pending.verifier)) return null;
      var created = pending[timestampName];
      var age = Date.now() - created;
      if (typeof created !== "number" || !Number.isFinite(created) ||
          age < 0 || age >= maxAge) return null;
      return pending;
    } catch (error) {
      return null;
    }
  }

  var recoveryPending = readPending(
    "localStorage", "alefit_password_recovery_pkce", "created", 60 * 60 * 1000
  );
  var oauthPending = readPending(
    "sessionStorage", "alefit_oauth_pending", "started", 20 * 60 * 1000
  );
  var recoveryType = query.get("type") === "recovery" || hash.get("type") === "recovery";
  var hasRecoveryMaterial = ["code", "token_hash", "access_token"].some(function (key) {
    return query.has(key) || hash.has(key);
  });
  var explicitRecoveryCallback = recoveryType && hasRecoveryMaterial;
  var rootCode = query.has("code") && root.location.pathname !== "/auth/callback";
  var recoveryCodeIsNewer = recoveryPending &&
    (!oauthPending || recoveryPending.created >= oauthPending.started);

  if ((explicitRecoveryCallback || (rootCode && recoveryCodeIsNewer)) &&
      root.location.pathname !== "/ResetPassword" &&
      root.location.pathname !== "/ResetPassword.html") {
    var resetPage = new URL("/ResetPassword", root.location.origin);
    resetPage.search = root.location.search || "";
    resetPage.hash = root.location.hash || "";
    root.location.replace(resetPage.toString());
    return;
  }

  if (rootCode) {
    var callback = new URL("/auth/callback", root.location.origin);
    callback.search = root.location.search || "";
    callback.hash = root.location.hash || "";
    root.location.replace(callback.toString());
    return;
  }

  var runVersion = 0;
  var leavingHome = false;

  function isHomePath() {
    return root.location.pathname === "/" || root.location.pathname === "/index.html";
  }

  function showPending() {
    document.documentElement.classList.add("member-entry-pending");
    var loader = document.getElementById("member-entry-loader");
    var heading = document.getElementById("member-entry-heading");
    var copy = document.getElementById("member-entry-copy");
    var spinner = loader && loader.querySelector(".member-entry-spinner");
    var actions = document.getElementById("member-entry-actions");
    if (heading) heading.textContent = "Getting your coaching space ready";
    if (copy) copy.textContent = "Checking your sign-in and saved training plan.";
    if (spinner) spinner.style.display = "";
    if (loader) loader.setAttribute("aria-busy", "true");
    if (actions) actions.style.display = "none";
  }

  function removePending() {
    var loader = document.getElementById("member-entry-loader");
    if (loader) loader.setAttribute("aria-busy", "false");
    document.documentElement.classList.remove("member-entry-pending");
  }

  function showError(message) {
    var loader = document.getElementById("member-entry-loader");
    var heading = document.getElementById("member-entry-heading");
    var copy = document.getElementById("member-entry-copy");
    var spinner = loader && loader.querySelector(".member-entry-spinner");
    var actions = document.getElementById("member-entry-actions");
    if (heading) heading.textContent = "We couldn’t check your ALEFIT account";
    if (copy) copy.textContent = message || "Your plan is unchanged. Check your connection and try again.";
    if (spinner) spinner.style.display = "none";
    if (loader) loader.setAttribute("aria-busy", "false");
    if (actions) {
      actions.style.display = "flex";
      actions.innerHTML = '<button type="button" id="member-entry-retry">Try again</button>' +
        '<a href="/Login.html?from_url=%2Ftoday.html%3Fview%3Dtoday">Sign in</a>';
      document.getElementById("member-entry-retry").addEventListener("click", function () {
        if (heading) heading.textContent = "Getting your coaching space ready";
        if (copy) copy.textContent = "Checking your sign-in and saved training plan.";
        if (spinner) spinner.style.display = "";
        if (loader) loader.setAttribute("aria-busy", "true");
        actions.style.display = "none";
        run();
      });
    }
  }

  async function run(version) {
    if (!root.AlefitMember || typeof root.AlefitMember.routeFromHome !== "function") {
      if (version !== runVersion || leavingHome) return;
      showError("ALEFIT’s sign-in check did not load. Refresh the page to try again.");
      return;
    }
    var result = await root.AlefitMember.routeFromHome();
    if (version !== runVersion || leavingHome) return;
    if (!result || result.state === "public") {
      removePending();
    } else if (result.state === "error") {
      showError(result.message);
    }
  }

  function start() {
    leavingHome = false;
    var version = ++runVersion;
    run(version).catch(function () {
      if (version === runVersion && !leavingHome) {
        showError("Your sign-in service could not be reached. Your plan is unchanged.");
      }
    });
  }

  if (typeof root.addEventListener === "function") {
    root.addEventListener("pagehide", function () {
      if (!isHomePath()) return;
      leavingHome = true;
      runVersion += 1;
      showPending();
    });
    root.addEventListener("pageshow", function (event) {
      if (!event.persisted || !isHomePath()) return;
      showPending();
      start();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}(window));
