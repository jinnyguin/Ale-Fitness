(function () {
  var images = {
    hiit: '/attached_assets/IMG_3771_1787106142440.jpeg',
    strength: '/attached_assets/IMG_3772_1787106142440.jpeg',
    mobility: '/attached_assets/IMG_3773_1787106142440.jpeg',
    basketball: '/attached_assets/IMG_3775_1787106142440.jpeg',
    football: '/attached_assets/IMG_3776_1787106142440.webp',
    soccer: '/attached_assets/IMG_3777_1787106142440.webp',
    baseball: '/attached_assets/IMG_3778_1787106142440.jpeg',
    swimming: '/attached_assets/IMG_3779_1787106142440.jpeg',
    track: '/attached_assets/IMG_3783_1787106142440.webp',
    crosscountry: '/attached_assets/IMG_3784_1787106142440.jpeg'
  };

  function applyProgramImages() {
    document.querySelectorAll('a[href*="/programs/"] img').forEach(function (img) {
      var href = img.closest('a').getAttribute('href') || '';
      var match = href.match(/\/programs\/([^/?#]+)/);
      var image = match && images[match[1]];
      if (image && img.src !== new URL(image, window.location.href).href) {
        img.src = image;
      }
    });
  }

  window.addEventListener('load', function () {
    applyProgramImages();
    new MutationObserver(applyProgramImages).observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();