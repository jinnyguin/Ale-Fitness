(function () {
  "use strict";

  window.trackEvent = function (name, data) {
    try {
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track(name, data || {});
      }
    } catch (error) {
      // Analytics must never interrupt the product flow.
    }
  };

  document.addEventListener("click", function (event) {
    var target = event.target.closest ? event.target.closest("[data-analytics-event]") : null;
    if (!target) return;
    window.trackEvent(target.getAttribute("data-analytics-event"), {
      location: target.getAttribute("data-analytics-location") || "unknown"
    });
  });
}());