// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────

document.addEventListener('click', function(e) {
  var th = e.target.closest('th');
  if (!th || !th.closest('table.cov')) return;
  var table = th.closest('table');
  var tbody = table.querySelector('tbody');
  if (!tbody) return;
  var idx = Array.from(th.parentNode.children).indexOf(th);
  if (idx < 1) return;
  var rows = Array.from(tbody.querySelectorAll('tr'));
  var asc = th.dataset.sort !== 'asc';
  th.dataset.sort = asc ? 'asc' : 'desc';
  rows.sort(function(a, b) {
    var av = a.children[idx] ? a.children[idx].textContent : '';
    var bv = b.children[idx] ? b.children[idx].textContent : '';
    var an = parseFloat(av) || 0;
    var bn = parseFloat(bv) || 0;
    return asc ? an - bn : bn - an;
  });
  rows.forEach(function(r) { tbody.appendChild(r); });
});
