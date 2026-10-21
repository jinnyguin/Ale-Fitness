(function (root) {
  "use strict";
  var location = root.location;
  var query = new URLSearchParams(location.search || "");
  if (query.has("code") && location.pathname !== "/auth/callback") {
    var callback = new URL("/auth/callback", location.origin);
    callback.search = location.search || "";
    callback.hash = location.hash || "";
    location.replace(callback.toString());
    return;
  }

  var member;
  try { member = root.AlefitMember && root.AlefitMember.hasMemberRecord(); }
  catch (error) { member = false; }
  if (!member) {
    document.documentElement.classList.remove("member-entry-pending");
    return;
  }
  if (root.AlefitMember) root.AlefitMember.routeFromHome();
  else {
    root.location.replace("/Login.html?from_url=%2FRegister.html");
  }
}(window));
