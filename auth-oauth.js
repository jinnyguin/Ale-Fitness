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

  async function startGoogle(returnTo) {
    var callbackUrl = new URL("/auth/callback", root.location.origin);
    callbackUrl.searchParams.set("from_url", safeReturnPath(returnTo));
    var params = new URLSearchParams({
      provider: "google",
      redirect_to: callbackUrl.toString()
    });
    var response;
    try {
      response = await root.fetch("/api/oauth/authorize?" + params.toString(), {
        headers: {Accept:"application/json"}
      });
    } catch (error) {
      throw new Error("Could not reach the sign-in service. Check your connection and try again.");
    }

    var data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Google sign-in could not be started. Please try again.");
    }
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Google sign-in could not be started.");
    }

    var destination;
    try {
      destination = new URL(data.url, root.location.origin);
    } catch (error) {
      throw new Error("Google sign-in returned an invalid address.");
    }
    if (destination.protocol !== "https:") {
      throw new Error("Google sign-in returned an insecure address.");
    }
    root.location.assign(destination.toString());
  }

  root.AlefitOAuth = {startGoogle:startGoogle};
}(window));