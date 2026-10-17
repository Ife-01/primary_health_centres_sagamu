// NIPOST postcodes are 11 alphanumeric chars: state(2) LGA(2) district(3) area(2) building(2).
// Hyphens are display-only, so everything is compared with separators stripped.
(function (root) {
  const compact = s => (s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

  // OG, OG20, OG20B70..., or a district-first code such as B70 / B70JY
  function isPostcodeQuery(q) {
    return /^(og|og\d[a-z0-9]*|[a-z]\d{2}[a-z0-9]*)$/.test(compact(q));
  }

  // Match by hierarchy prefix (state > LGA > district > area > building),
  // or by a district-first query that skips the state and LGA.
  function matchesPostcode(postcode, q) {
    const pc = compact(postcode);
    const needle = compact(q);
    if (!pc || !needle) return false;
    return pc.startsWith(needle) || pc.slice(4).startsWith(needle);
  }

  const api = { isPostcodeQuery, matchesPostcode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Postcode = api;
})(typeof window !== 'undefined' ? window : globalThis);
