// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

(function() {
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function jsonForScript(v) {
  var s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.replace(/[<>&]/g, function(c){ return "\\u"+("000"+c.charCodeAt(0).toString(16)).slice(-4); });
}

function escVal(v) { return esc(String(v)); }

function robotsLine(v) { return String(v).replace(/[\r\n]+/g, ' '); }

function createSEO(config) {
  var site = config.site || {};
  var defaultMeta = config.meta || {};
  var defaultOg = config.og || {};
  var defaultTwitter = config.twitter || {};
  var robotsConfig = config.robots || {};
  var sitemapConfig = config.sitemap || {};
  var faviconConfig = config.favicon || {};
  var baseUrl = (site.url || '').replace(/\/$/, '');

  function headTags(pageMeta) {
    var meta = Object.assign({}, defaultMeta, pageMeta || {});
    var og = Object.assign({}, defaultOg, meta.og || {});
    var twitter = Object.assign({}, defaultTwitter, meta.twitter || {});
    var canonical = meta.canonical ? baseUrl + meta.canonical : (meta.url || '');
    var lines = [];

    if (meta.title) lines.push('<title>' + esc(meta.title) + '</title>');
    if (meta.description) lines.push('<meta name="description" content="' + esc(meta.description) + '">');
    if (meta.keywords) {
      var kw = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : meta.keywords;
      lines.push('<meta name="keywords" content="' + esc(kw) + '">');
    }
    if (meta.author) lines.push('<meta name="author" content="' + esc(meta.author) + '">');
    if (meta.robots !== false) lines.push('<meta name="robots" content="' + esc(meta.robots || 'index, follow') + '">');

    if (canonical) lines.push('<link rel="canonical" href="' + esc(canonical) + '">');

    if (faviconConfig.ico) lines.push('<link rel="icon" href="' + esc(faviconConfig.ico) + '" sizes="32x32">');
    if (faviconConfig.svg) lines.push('<link rel="icon" href="' + esc(faviconConfig.svg) + '" type="image/svg+xml">');
    if (faviconConfig.apple) lines.push('<link rel="apple-touch-icon" href="' + esc(faviconConfig.apple) + '">');

    if (og.type || defaultOg.type) lines.push('<meta property="og:type" content="' + esc(og.type || 'website') + '">');
    if (meta.title || og.title) lines.push('<meta property="og:title" content="' + esc(og.title || meta.title) + '">');
    if (meta.description || og.description) lines.push('<meta property="og:description" content="' + esc(og.description || meta.description) + '">');
    if (og.image) {
      lines.push('<meta property="og:image" content="' + esc(og.image) + '">');
      if (og.imageWidth) lines.push('<meta property="og:image:width" content="' + escVal(og.imageWidth) + '">');
      if (og.imageHeight) lines.push('<meta property="og:image:height" content="' + escVal(og.imageHeight) + '">');
    }
    if (canonical || og.url) lines.push('<meta property="og:url" content="' + esc(og.url || canonical) + '">');
    if (site.name) lines.push('<meta property="og:site_name" content="' + esc(site.name) + '">');
    if (site.language) lines.push('<meta property="og:locale" content="' + esc(site.language) + '">');

    if (twitter.card) lines.push('<meta name="twitter:card" content="' + esc(twitter.card) + '">');
    if (twitter.site) lines.push('<meta name="twitter:site" content="' + esc(twitter.site) + '">');
    if (meta.title || twitter.title) lines.push('<meta name="twitter:title" content="' + esc(twitter.title || meta.title) + '">');
    if (meta.description || twitter.description) lines.push('<meta name="twitter:description" content="' + esc(twitter.description || meta.description) + '">');
    if (twitter.image || og.image) lines.push('<meta name="twitter:image" content="' + esc(twitter.image || og.image) + '">');

    return lines.join('\n');
  }

  function robotsTxt() {
    var lines = [];
    var allow = robotsConfig.allow || ['/'];
    var disallow = robotsConfig.disallow || [];

    lines.push('User-agent: *');
    for (var i = 0; i < allow.length; i++) lines.push('Allow: ' + robotsLine(allow[i]));
    for (var j = 0; j < disallow.length; j++) lines.push('Disallow: ' + robotsLine(disallow[j]));
    if (robotsConfig.crawlDelay) lines.push('Crawl-delay: ' + robotsLine(robotsConfig.crawlDelay));
    if (robotsConfig.sitemap) lines.push('Sitemap: ' + robotsLine(robotsConfig.sitemap));
    else if (baseUrl) lines.push('Sitemap: ' + baseUrl + '/sitemap.xml');

    if (robotsConfig.agents) {
      for (var agent in robotsConfig.agents) {
        if (!Object.prototype.hasOwnProperty.call(robotsConfig.agents, agent)) continue;
        var rules = robotsConfig.agents[agent];
        lines.push('');
        lines.push('User-agent: ' + robotsLine(agent));
        if (rules.allow) for (var a = 0; a < rules.allow.length; a++) lines.push('Allow: ' + robotsLine(rules.allow[a]));
        if (rules.disallow) for (var d = 0; d < rules.disallow.length; d++) lines.push('Disallow: ' + robotsLine(rules.disallow[d]));
        if (rules.crawlDelay) lines.push('Crawl-delay: ' + robotsLine(rules.crawlDelay));
      }
    }

    return lines.join('\n');
  }

  
  
  function sitemapXml(discovered) {
    var urls = [];
    var configured = sitemapConfig.routes || [];
    var base = configured.length ? configured : (Array.isArray(discovered) ? discovered : []);
    for (var i = 0; i < base.length; i++) {
      urls.push(typeof base[i] === 'string' ? { path: base[i] } : base[i]);
    }
    if (typeof sitemapConfig.dynamicRoutes === 'function') {
      var dynamic = sitemapConfig.dynamicRoutes();
      if (Array.isArray(dynamic)) {
        for (var d = 0; d < dynamic.length; d++) urls.push(dynamic[d]);
      }
    }

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (var u = 0; u < urls.length; u++) {
      var entry = urls[u];
      if (typeof entry === 'string') entry = { path: entry };   
      var p = entry && entry.path != null ? String(entry.path) : '';
      var loc = p.indexOf('http') === 0 ? p : baseUrl + p;
      xml += '  <url>\n';
      xml += '    <loc>' + esc(loc) + '</loc>\n';
      if (entry.lastmod) xml += '    <lastmod>' + escVal(entry.lastmod) + '</lastmod>\n';
      if (entry.changefreq) xml += '    <changefreq>' + escVal(entry.changefreq) + '</changefreq>\n';
      if (entry.priority !== undefined) xml += '    <priority>' + escVal(entry.priority) + '</priority>\n';
      xml += '  </url>\n';
    }
    xml += '</urlset>';
    return xml;
  }

  function structuredData(jsonLd) {
    return '<script type="application/ld+json">' + jsonForScript(jsonLd) + '</script>';
  }

  return { headTags: headTags, robotsTxt: robotsTxt, sitemapXml: sitemapXml, structuredData: structuredData };
}

return { createSEO: createSEO };
})()
