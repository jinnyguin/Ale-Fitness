(function (root) {
  "use strict";

  var APP_ID = "6a1f3d189ebdbe71fa7d256c";

  async function request(path, payload, defaultMessage) {
    if (!root.AlefitSession || typeof root.AlefitSession.timedFetch !== "function") {
      throw new Error("Email-code sign-in is unavailable. Refresh the page and try again.");
    }
    var response;
    try {
      response = await root.AlefitSession.timedFetch("/api/apps/" + APP_ID + path, {
        method: "POST",
        headers: {"Content-Type":"application/json", "Accept":"application/json"},
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(error.message || "Could not reach the email-code service. Check your connection and try again.");
    }

    var data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(defaultMessage);
    }
    if (!response.ok) {
      var failure = new Error(data && data.error || defaultMessage);
      failure.status = response.status;
      failure.retryAfterSeconds = Number(data && data.retry_after_seconds) || 0;
      throw failure;
    }
    return data;
  }

  function send(email, options) {
    options = options || {};
    return request("/auth/email-code", {
      email: email,
      create_user: options.createUser === true,
      full_name: options.fullName || "",
    }, "Could not send your code. Please try again.");
  }

  function verify(email, code) {
    return request("/auth/email-code/verify", {
      email: email,
      token: code,
    }, "Could not verify your code. Please request a new one.");
  }

  async function isEnabled() {
    if (!root.AlefitSession || typeof root.AlefitSession.timedFetch !== "function") return false;
    try {
      var response = await root.AlefitSession.timedFetch(
        "/api/apps/public/prod/public-settings/by-id/" + APP_ID,
        {headers:{"Accept":"application/json"}}
      );
      if (!response.ok) return false;
      var data = await response.json();
      return !!(data && data.auth && data.auth.email_code_enabled === true);
    } catch (error) {
      return false;
    }
  }

  root.AlefitEmailCode = {send:send, verify:verify, isEnabled:isEnabled};
}(window));
