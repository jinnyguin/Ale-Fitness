(function (root) {
  "use strict";

  var APP_ID = "6a1f3d189ebdbe71fa7d256c";
  var MEMBER_KEY = "alefit_member_account";
  var SETUP_KEY = "alefit_member_setup_complete";

  function read(key) {
    try { return root.localStorage.getItem(key); } catch (error) { return null; }
  }

  function write(key, value) {
    try { root.localStorage.setItem(key, String(value)); return true; }
    catch (error) { return false; }
  }

  function token() {
    return read("base44_access_token") || read("token");
  }

  function markSignedIn(user) {
    var identity = user && (user.id || user.email);
    return write(MEMBER_KEY, identity || "known");
  }

  function markSetupComplete(complete) {
    return write(SETUP_KEY, complete ? "1" : "0");
  }

  function clearSession() {
    try {
      root.localStorage.removeItem("base44_access_token");
      root.localStorage.removeItem("token");
      root.localStorage.removeItem("alefit_user");
      root.localStorage.removeItem("alefit_refresh_token");
      root.localStorage.removeItem("alefit_refresh_owner");
    } catch (error) {}
  }

  function safePath(value) {
    try {
      var target = new URL(value || "/", root.location.origin);
      return target.origin === root.location.origin ?
        target.pathname + target.search + target.hash : "/";
    } catch (error) {
      return "/";
    }
  }

  function recordsFrom(data) {
    return Array.isArray(data) ? data : (data && (data.data || data.items)) || [];
  }

  async function hasSavedPlan(accessToken) {
    var response = await root.fetch("/api/apps/" + APP_ID + "/entities/OnboardingPlan?limit=1", {
      headers: { Authorization: "Bearer " + accessToken }
    });
    if (!response.ok) throw new Error("Could not check the saved plan.");
    return recordsFrom(await response.json()).length > 0;
  }

  function loginUrl(destination) {
    return "/Login.html?from_url=" + encodeURIComponent(destination);
  }

  async function routeFromHome() {
    var accessToken = token();
    if (!accessToken) {
      var destination = read(SETUP_KEY) === "1" ?
        "/today.html?view=today" : "/Register.html";
      root.location.replace(loginUrl(destination));
      return;
    }

    try {
      var response = await root.fetch("/api/apps/" + APP_ID + "/auth/me", {
        headers: { Authorization: "Bearer " + accessToken }
      });
      if (response.status === 401 || response.status === 403) {
        clearSession();
        root.location.replace(loginUrl(
          read(SETUP_KEY) === "1" ? "/today.html?view=today" : "/Register.html"
        ));
        return;
      }
      if (!response.ok) throw new Error("Could not verify the saved sign-in.");
      var user = await response.json();
      if (!user || typeof user.id !== "string" || !user.id.trim()) {
        throw new Error("The saved sign-in could not be verified.");
      }
      markSignedIn(user);
      var complete = await hasSavedPlan(accessToken);
      markSetupComplete(complete);
      root.location.replace(complete ? "/today.html?view=today" : "/Register.html");
    } catch (error) {
      // Stay inside the member experience during an outage; the dashboard
      // will show its own useful sign-in/service state.
      root.location.replace("/today.html?view=today");
    }
  }

  async function routeAfterSignIn(user, preferredPath) {
    markSignedIn(user);
    var destination = safePath(preferredPath || "/today.html?view=plan");
    if (/^\/Register\.html(?:[?#]|$)/i.test(destination)) {
      root.location.replace(destination);
      return destination;
    }
    if (/^\/(?:|index\.html)$/.test(destination) || /^\/today\.html(?:[?#]|$)/i.test(destination) ||
        /^\/my-plan\.html(?:[?#]|$)/i.test(destination)) {
      try {
        var complete = await hasSavedPlan(token());
        markSetupComplete(complete);
        destination = complete ? "/today.html?view=plan" : "/Register.html";
      } catch (error) {
        destination = "/Register.html";
      }
    }
    root.location.replace(destination);
    return destination;
  }

  root.AlefitMember = {
    markSignedIn: markSignedIn,
    markSetupComplete: markSetupComplete,
    routeFromHome: routeFromHome,
    routeAfterSignIn: routeAfterSignIn,
    hasMemberRecord: function () { return !!(read(MEMBER_KEY) || token()); },
    safePath: safePath
  };
}(window));
