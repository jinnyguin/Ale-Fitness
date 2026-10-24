(function (root) {
  "use strict";
  var nativeFetch = root.fetch.bind(root);
  var refreshing = null;
  var rotatedTokens = new Set();
  var APP_ID = "6a1f3d189ebdbe71fa7d256c";
  function read(key) {
    try { return root.localStorage.getItem(key); } catch (error) { return null; }
  }
  function remove(key) {
    try { root.localStorage.removeItem(key); } catch (error) {}
  }
  function token() {
    return read("base44_access_token") || read("token");
  }
  function clearRefresh() {
    remove("alefit_refresh_token");
    remove("alefit_refresh_owner");
  }
  function save(session) {
    if (!session || !session.access_token) throw new Error("No valid sign-in session was received.");
    root.localStorage.setItem("base44_access_token", session.access_token);
    root.localStorage.setItem("token", session.access_token);
    if (session.user) root.localStorage.setItem("alefit_user", JSON.stringify(session.user));
    if (session.refresh_token) {
      // Compatibility for older deployments; new sessions use an HttpOnly cookie.
      root.localStorage.setItem("alefit_refresh_token", session.refresh_token);
      root.localStorage.setItem("alefit_refresh_owner", session.access_token);
    } else clearRefresh();
  }
  async function timedFetch(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      return await nativeFetch(url, Object.assign({credentials:"same-origin"}, options, {signal:controller.signal}));
    } catch (error) {
      throw new Error(error.name === "AbortError" ?
        "Sign-in timed out. Check your connection and try again." :
        "Could not reach the sign-in service. Check your connection and try again.");
    } finally { clearTimeout(timer); }
  }
  async function exchange(body) {
    var response = await timedFetch("/api/oauth/session", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body || {})
    });
    var data = await response.json();
    if (!response.ok) {
      var error = new Error(data.error || "Sign-in could not be completed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function restore() {
    var current = token();
    if (current) {
      var check = await timedFetch("/api/apps/" + APP_ID + "/auth/me", {
        headers: {Authorization:"Bearer " + current}
      });
      if (check.ok) {
        var user = await check.json();
        if (!user || typeof user.id !== "string" || !user.id.trim()) {
          throw new Error("The saved sign-in could not be verified.");
        }
        try { root.localStorage.setItem("alefit_user", JSON.stringify(user)); } catch (error) {}
        return {authenticated:true, user:user, access_token:current};
      }
      if (check.status !== 401 && check.status !== 403) {
        throw new Error("Could not verify your saved sign-in. Please try again.");
      }
    }

    var legacyRefresh = read("alefit_refresh_token");
    var session;
    try {
      session = await exchange(legacyRefresh ? {refresh_token:legacyRefresh} : {});
    } catch (error) {
      if (error.status === 401) {
        remove("base44_access_token");
        remove("token");
        remove("alefit_user");
        clearRefresh();
        return {authenticated:false, user:null};
      }
      throw error;
    }
    save(session);
    var response = await timedFetch("/api/apps/" + APP_ID + "/auth/me", {
      headers: {Authorization:"Bearer " + session.access_token}
    });
    var restoredUser = await response.json().catch(function () { return null; });
    if (!response.ok || !restoredUser || typeof restoredUser.id !== "string" || !restoredUser.id.trim()) {
      if (response.status === 401 || response.status === 403) {
        remove("base44_access_token");
        remove("token");
        remove("alefit_user");
        clearRefresh();
        return {authenticated:false, user:null};
      }
      throw new Error("Could not finish restoring your sign-in. Please try again.");
    }
    try { root.localStorage.setItem("alefit_user", JSON.stringify(restoredUser)); } catch (error) {}
    return {authenticated:true, user:restoredUser, access_token:session.access_token};
  }
  // Only retry this app's API and only for the currently saved account.
  // New refresh tokens are HttpOnly cookies; legacy browser refresh tokens are migrated.
  root.fetch = async function (url, options) {
    var isAppApi = typeof url === "string" && url.startsWith("/api/apps/");
    var response = await (isAppApi ? timedFetch(url, options) : nativeFetch(url, options));
    if (response.status !== 401 || typeof url !== "string") return response;
    var target = new URL(url, root.location.origin);
    if (target.origin !== root.location.origin || !target.pathname.startsWith("/api/apps/")) return response;
    var headers = new Headers(options && options.headers);
    var oldToken = (headers.get("Authorization") || "").replace(/^Bearer /, "");
    var current = token();
    if (!oldToken || !current || current.startsWith("local.")) return response;
    if (oldToken !== current) {
      if (!rotatedTokens.has(oldToken) || read("alefit_refresh_owner") !== current) return response;
      headers.set("Authorization", "Bearer " + current);
      return timedFetch(url, Object.assign({}, options, {headers:headers}));
    }
    var refresh = read("alefit_refresh_token");
    if (refresh && read("alefit_refresh_owner") !== current) return response;
    if (!refreshing) {
      refreshing = exchange(refresh ? {refresh_token:refresh} : {}).then(function (session) {
        if (token() !== oldToken) throw new Error("The signed-in account changed. Refresh this page.");
        save(session);
        rotatedTokens.add(oldToken);
        return session.access_token;
      }).catch(function (error) {
        if (error.status === 401 && token() === oldToken) clearRefresh();
        throw error;
      }).finally(function () { refreshing = null; });
    }
    try {
      var renewed = await refreshing;
      headers.set("Authorization", "Bearer " + renewed);
      return await timedFetch(url, Object.assign({}, options, {headers:headers}));
    } catch (error) {
      if (error.status === 401) return response;
      // Do not make an outage look like a rejected account and erase its draft.
      return new Response(JSON.stringify({error:error.message}), {
        status:503, headers:{"Content-Type":"application/json"}
      });
    }
  };
  root.AlefitSession = {save:save, exchange:exchange, restore:restore, timedFetch:timedFetch};
}(window));
