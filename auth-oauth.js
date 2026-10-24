(function (root) {
  "use strict";

  function safeReturnPath(value) {
    try {
      var target = new URL(value || "/", root.location.origin);
      return target.origin === root.location.origin ?
        target.pathname + target.search + target.hash : "/";
    } catch (error) {
      return "/";
    }
  }

  var APP_ID = "6a1f3d189ebdbe71fa7d256c";

  async function availableProviders() {
    try {
      var response = await root.AlefitSession.timedFetch(
        "/api/apps/public/prod/public-settings/by-id/" + APP_ID,
        {headers:{Accept:"application/json"}}
      );
      if (!response.ok) return ["email"];
      var data = await response.json();
      var providers = data && data.auth && Array.isArray(data.auth.providers) ?
        data.auth.providers : [];
      return ["email"].concat(providers.filter(function (provider) {
        return provider === "google" || provider === "apple";
      }));
    } catch (error) {
      // Fail closed: a provider is not offered unless the server confirms it.
      return ["email"];
    }
  }

  async function start(provider, returnTo) {
    if (provider !== "google" && provider !== "apple") {
      throw new Error("This sign-in provider is not supported.");
    }
    var providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    var bytes = new Uint8Array(32);
    root.crypto.getRandomValues(bytes);
    var verifier = Array.from(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    var digest = await root.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    var challenge = btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    try {
      root.sessionStorage.setItem("alefit_oauth_pending", JSON.stringify({
        verifier:verifier, returnTo:safeReturnPath(returnTo), provider:provider, started:Date.now()
      }));
    } catch (error) {
      throw new Error("Your browser blocked sign-in storage. Allow site data for ALEFIT and try again.");
    }
    var callbackUrl = new URL("/auth/callback", root.location.origin);
    callbackUrl.searchParams.set("from_url", safeReturnPath(returnTo));
    var params = new URLSearchParams({
      provider: provider,
      redirect_to: callbackUrl.toString(),
      code_challenge: challenge
    });
    var response;
    try {
      response = await root.AlefitSession.timedFetch("/api/oauth/authorize?" + params.toString(), {
        headers: {Accept:"application/json"}
      });
    } catch (error) {
      throw new Error(error.message || "Could not reach the sign-in service. Check your connection and try again.");
    }

    var data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(providerName + " sign-in could not be started. Please try again.");
    }
    if (!response.ok || !data.url) {
      throw new Error(data.error || providerName + " sign-in could not be started.");
    }

    var destination;
    try {
      destination = new URL(data.url, root.location.origin);
    } catch (error) {
      throw new Error(providerName + " sign-in returned an invalid address.");
    }
    if (destination.protocol !== "https:") {
      throw new Error(providerName + " sign-in returned an insecure address.");
    }
    root.location.assign(destination.toString());
  }

  root.AlefitOAuth = {
    availableProviders: availableProviders,
    start: start,
    startGoogle: function (returnTo) { return start("google", returnTo); },
    startApple: function (returnTo) { return start("apple", returnTo); }
  };
}(window));