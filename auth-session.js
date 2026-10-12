(function (root) {
  "use strict";
  var nativeFetch = root.fetch.bind(root);
  var refreshing = null;
  var rotatedTokens = new Set();
  function token() {
    return root.localStorage.getItem("base44_access_token") || root.localStorage.getItem("token");
  }
  function clearRefresh() {
    root.localStorage.removeItem("alefit_refresh_token");
    root.localStorage.removeItem("alefit_refresh_owner");
  }
  function save(session) {
    if (!session || !session.access_token) throw new Error("No valid sign-in session was received.");
    clearRefresh();
    root.localStorage.setItem("base44_access_token", session.access_token);
    root.localStorage.setItem("token", session.access_token);
    if (session.refresh_token) {
      root.localStorage.setItem("alefit_refresh_token", session.refresh_token);
      root.localStorage.setItem("alefit_refresh_owner", session.access_token);
    }
  }
  async function timedFetch(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      return await nativeFetch(url, Object.assign({}, options, {signal:controller.signal}));
    } catch (error) {
      throw new Error(error.name === "AbortError" ?
        "Sign-in timed out. Check your connection and try again." :
        "Could not reach the sign-in service. Check your connection and try again.");
    } finally { clearTimeout(timer); }
  }
  async function exchange(body) {
    var response = await timedFetch("/api/oauth/session", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
    });
    var data = await response.json();
    if (!response.ok) {
      var error = new Error(data.error || "Sign-in could not be completed.");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  // Only retry this app's API and only for the currently saved account.
  // An email login/logout cannot reuse another account's stale refresh token.
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
      if (!rotatedTokens.has(oldToken) || root.localStorage.getItem("alefit_refresh_owner") !== current) return response;
      headers.set("Authorization", "Bearer " + current);
      return timedFetch(url, Object.assign({}, options, {headers:headers}));
    }
    var refresh = root.localStorage.getItem("alefit_refresh_token");
    if (!refresh || root.localStorage.getItem("alefit_refresh_owner") !== current) return response;
    if (!refreshing) {
      refreshing = exchange({refresh_token:refresh}).then(function (session) {
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
  root.AlefitSession = {save:save, exchange:exchange, timedFetch:timedFetch};
}(window));
