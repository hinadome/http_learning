(function () {
  try {
    var t = localStorage.getItem("http-learning-checker-theme");
    if (
      t === "dark" ||
      (!t && matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.dataset.theme = "dark";
    }
  } catch (e) {
    /* ignore */
  }
})();
