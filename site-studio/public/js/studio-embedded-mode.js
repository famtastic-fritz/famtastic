(function () {
  try {
    if (new URLSearchParams(location.search).get('embedded') === '1') {
      document.documentElement.classList.add('studio-embedded');
    }
  } catch (_e) {}
})();
