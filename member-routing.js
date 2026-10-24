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
    return read("base44_access_token") || read("token") ||
      (root.AlefitSession && typeof root.AlefitSession.accessToken === "function" ?
        root.AlefitSession.accessToken() : null);
  }

  function markSignedIn(user) {
    var identity = user && (user.id || user.email);
    return write(MEMBER_KEY, identity || "known");
  }

  function markSetupComplete(complete) {
    return write(SETUP_KEY, complete ? "1" : "0");
  }

  function clearSession() {
    if (root.AlefitSession && typeof root.AlefitSession.clear === "function") {
      root.AlefitSession.clear();
    }
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

  async function fetchMemberStatus(accessToken) {
    var response = await root.fetch("/api/apps/" + APP_ID + "/member-status", {
      headers: { Authorization: "Bearer " + accessToken }
    });
    if (response.status === 401 || response.status === 403) {
      var authError = new Error("Your sign-in has expired. Please sign in again.");
      authError.status = response.status;
      throw authError;
    }
    if (!response.ok) {
      throw new Error("Could not check your saved training plan. Please retry.");
    }
    var status = await response.json();
    if (!status || !status.user || typeof status.user.id !== "string" ||
        typeof status.setup_complete !== "boolean") {
      throw new Error("ALEFIT could not verify your member profile. Please retry.");
    }
    return status;
  }

  function loginUrl(destination) {
    return "/Login.html?from_url=" + encodeURIComponent(destination);
  }

  async function routeFromHome() {
    var knownMember = !!(read(MEMBER_KEY) || token());
    var restored;
    try {
      if (!root.AlefitSession || typeof root.AlefitSession.restore !== "function") {
        throw new Error("ALEFIT could not restore your sign-in. Please retry.");
      }
      restored = await root.AlefitSession.restore();
    } catch (error) {
      return { state: "error", message: error.message || "ALEFIT could not check your sign-in. Please retry." };
    }

    if (!restored || !restored.authenticated || !restored.user) {
      clearSession();
      if (!knownMember) return { state: "public" };
      root.location.replace(loginUrl("/today.html?view=today"));
      return { state: "redirect" };
    }

    try {
      var status = await fetchMemberStatus(restored.access_token || token());
      markSignedIn(status.user);
      markSetupComplete(status.setup_complete);
      root.location.replace(status.plan ?
        "/today.html?view=today" : "/Register.html");
      return { state: "redirect" };
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        clearSession();
        root.location.replace(loginUrl("/today.html?view=today"));
        return { state: "redirect" };
      }
      return { state: "error", message: error.message || "Could not check your saved training plan. Please retry." };
    }
  }

  async function routeAfterSignIn(user, preferredPath) {
    markSignedIn(user);
    var intendedPath = safePath(preferredPath || "/today.html?view=today");
    var status = await fetchMemberStatus(token());
    markSignedIn(status.user);
    markSetupComplete(status.setup_complete);
    // Server-side records are authoritative. Never let a stale/missing browser
    // flag send a member with a saved plan back through onboarding.
    var destination = status.plan ? "/today.html?view=today" :
      (/^\/Register\.html(?:[?#]|$)/i.test(intendedPath) ? intendedPath : "/Register.html");
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
