/**
 * Instant navigation. docs/motion.md (Tools, #10, #11).
 * Chromium prerenders product pages. Astro prefetch covers other browsers.
 */

export const speculationRules = JSON.stringify({
  prerender: [
    {
      source: "document",
      where: {
        and: [
          { href_matches: "/product/*" },
          { not: { href_matches: "/checkout" } },
          { not: { href_matches: "/checkout/*" } },
          { not: { href_matches: "/api" } },
          { not: { href_matches: "/api/*" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
});

/**
 * Direct loads show the product page as it rests.
 * A same-origin link plays the entrance, unless a view transition is already
 * running that entrance. Back and forward do not replay it.
 */
export const enterGateScript = `(function () {
  var nav = performance.getEntriesByType("navigation")[0];
  var fromHere = false;
  try {
    fromHere = !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch (e) {}
  if (!(nav && nav.type === "navigate" && fromHere)) document.documentElement.classList.add("skip-enter");
  document.addEventListener("pagereveal", function (event) {
    if (event.viewTransition) document.documentElement.classList.add("skip-enter");
  });
})();`;
