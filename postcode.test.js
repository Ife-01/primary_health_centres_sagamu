const test = require('node:test');
const assert = require('node:assert/strict');
const { isPostcodeQuery, matchesPostcode } = require('./postcode.js');

const PC = 'OG-20-B70-JY-20';

test('matches at every hierarchy level, hyphenated and concatenated', () => {
  const queries = [
    'OG', 'og',                                  // state
    'OG-20', 'OG20',                             // LGA
    'OG-20-B70', 'OG20B70', 'og-20-b70',         // district
    'OG-20-B70-JY', 'OG20B70JY', 'og20b70jy',    // area
    'OG-20-B70-JY-20', 'OG20B70JY20',            // building
  ];
  for (const q of queries) assert.ok(matchesPostcode(PC, q), q);
});

test('district-first queries skip state and LGA', () => {
  for (const q of ['B70', 'b70', 'B70JY', 'B70-JY', 'B70JY20']) {
    assert.ok(matchesPostcode(PC, q), q);
  }
});

test('stored postcode matches whether hyphenated or concatenated', () => {
  assert.ok(matchesPostcode('OG20B70JY20', 'OG-20-B70'));
  assert.ok(matchesPostcode('og-20-b70-jy-20', 'B70JY'));
});

test('does not match other districts, areas or buildings', () => {
  assert.equal(matchesPostcode(PC, 'B72'), false);
  assert.equal(matchesPostcode(PC, 'OG-20-B70-RM'), false);
  assert.equal(matchesPostcode(PC, 'OG-20-B70-JY-21'), false);
  assert.equal(matchesPostcode(PC, 'OG-21'), false);
  assert.equal(matchesPostcode(PC, 'LA'), false);
});

test('a bare area code does not match on its own', () => {
  assert.equal(matchesPostcode(PC, 'JY'), false);
});

test('missing postcode or empty query never matches', () => {
  assert.equal(matchesPostcode(null, 'B70'), false);
  assert.equal(matchesPostcode('', 'B70'), false);
  assert.equal(matchesPostcode(PC, ''), false);
  assert.equal(matchesPostcode(PC, '--'), false);
});

test('isPostcodeQuery recognises postcode-style input', () => {
  for (const q of ['OG', 'og-20', 'OG20B70', 'OG-20-B70-JY-20', 'B70', 'b70jy', 'A21']) {
    assert.ok(isPostcodeQuery(q), q);
  }
});

test('isPostcodeQuery leaves names and text to the fuzzy search', () => {
  for (const q of ['ogijo', 'sabo agura', 'Aruba', 'Ojumele', 'bike', '', '  ']) {
    assert.equal(isPostcodeQuery(q), false, q);
  }
});

test('real data: district and area counts', () => {
  const rows = require('./data/phcs.json');
  const count = q => rows.filter(r => matchesPostcode(r.postcode, q)).length;
  assert.equal(count('OG'), 17);
  assert.equal(count('OG-20-B70'), 6);
  assert.equal(count('B70'), 6);
  assert.equal(count('OG-20-B70-JY'), 1);
  assert.equal(count('OG-20-B70-JY-20'), 1);
});
