(function (root) {
  "use strict";
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
