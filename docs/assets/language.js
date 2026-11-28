(function () {
  const selector = document.getElementById("site-language");
  const label = selector.closest("label");
  const code = label.querySelector(".site-language-code");
  const status = document.getElementById("language-status");
  const defaultLocale = document.documentElement.lang;
  const locales = new Set([...selector.options].map(option => option.value));
  const assetRoot = new URL(".", document.currentScript.src);
  const storageKey = "sharpclips-site-language";
  const normalize = value => value.trim().replace(/\s+/g, " ");
  const excluded = "svg, script, style, [translate='no'], option[lang], [lang]:not(html), #language-status, .site-language-code";
  const bindings = [];
  const catalogs = new Map([[defaultLocale, {}]]);
  let locale = defaultLocale;
  let messages = {};
  let revision = 0;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const original = node.nodeValue;
    const key = normalize(original);
    if (key && !node.parentElement.closest(excluded)) {
      const prefix = original.match(/^\s*/)[0];
      const suffix = original.match(/\s*$/)[0];
      bindings.push([key, translated => { node.nodeValue = prefix + translated + suffix; }]);
    }
  }
  for (const attribute of ["alt", "aria-label", "title", "placeholder", "content"]) {
    const query = attribute === "content"
      ? 'meta[name="description"], meta[property="og:title"], meta[property="og:description"]'
      : `[${attribute}]`;
    for (const node of document.querySelectorAll(query)) {
      const key = normalize(node.getAttribute(attribute) || "");
      if (key && !node.closest(excluded)) bindings.push([key, translated => node.setAttribute(attribute, translated)]);
    }
  }
  bindings.push([document.title, translated => { document.title = translated; }]);

  function message(key, values) {
    const text = Object.hasOwn(messages, key) ? messages[key] : key;
    if (!values) return text;
    return text.replace(/\{(\w+)\}/g, (token, name) => values[name] ?? token);
  }

  function loadCatalog(language) {
    if (!catalogs.has(language)) {
      const request = fetch(new URL(`languages/${language}.json`, assetRoot))
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .catch(error => {
          catalogs.delete(language);
          throw error;
        });
      catalogs.set(language, request);
    }
    return catalogs.get(language);
  }

  function savedLocale() {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  }

  function requestedLocale() {
    const requested = new URL(location.href).searchParams.get("lang");
    if (locales.has(requested)) return requested;
    const saved = savedLocale();
    if (locales.has(saved)) return saved;
    return (navigator.languages || [navigator.language])
      .map(tag => [...locales].find(supported => supported === tag || supported.split("-")[0] === tag.split("-")[0]))
      .find(Boolean) || defaultLocale;
  }

  function persist(language) {
    try { localStorage.setItem(storageKey, language); } catch { /* URL links still carry the preference. */ }
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(history.state, "", url);
  }

  function updateInternalLinks(language) {
    for (const link of document.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href");
      if (!/^(\.\/|(?:privacidade|termos|exclusao-de-dados)\.html)$/.test(href) && !link.hasAttribute("data-language-link")) continue;
      const target = new URL(href, location.href);
      target.searchParams.set("lang", language);
      link.setAttribute("href", target.pathname + target.search + target.hash);
      link.setAttribute("data-language-link", "");
    }
  }

  function updateExternalLinks(language) {
    const subject = document.querySelector("a.contact-gmail");
    if (subject) {
      const url = new URL(subject.href);
      url.searchParams.set("su", message("Sugestões e feedback sobre o SharpClips AI"));
      subject.href = url.href;
    }
    const privacy = document.querySelector('a[href^="https://policies.google.com/privacy"]');
    if (privacy) {
      const url = new URL(privacy.href);
      url.searchParams.set("hl", language);
      privacy.href = url.href;
    }
  }

  async function setLanguage(language, save) {
    const current = ++revision;
    try {
      const translations = await loadCatalog(language);
      if (current !== revision) return;
      messages = translations;
      locale = language;
      for (const [key, apply] of bindings) apply(message(key));
      document.documentElement.lang = language;
      selector.value = language;
      code.textContent = language;
      updateInternalLinks(language);
      updateExternalLinks(language);
      if (save) persist(language);
      status.textContent = "";
      document.dispatchEvent(new Event("site-language-change"));
    } catch {
      if (current !== revision) return;
      selector.value = locale;
      status.textContent = message("Não foi possível carregar este idioma. Tente novamente.");
    }
  }

  window.siteLanguage = { message, get locale() { return locale; } };
  selector.addEventListener("change", () => setLanguage(selector.value, true));
  label.hidden = false;
  const initial = requestedLocale();
  setLanguage(initial, new URL(location.href).searchParams.has("lang"));
})();
