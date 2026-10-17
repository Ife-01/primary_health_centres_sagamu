const test = require('node:test');
const assert = require('node:assert/strict');
const { facilitiesForClinic } = require('./clinic-filter.js');

const ALL_WEEK = { Mon: '24 hours', Tue: '24 hours', Wed: '24 hours', Thu: '24 hours', Fri: '24 hours', Sat: '24 hours', Sun: '24 hours' };
const SETTINGS = { opening_hours_global: ALL_WEEK };
const CLINICS = {
  OGIJO: { immunization: ['Tue', 'Wed'], antenatal: ['Mon', 'Thu'] },
  AGBOWA: { immunization: ['Wed'], antenatal: ['Mon'] },
  EMPTY: { immunization: [], antenatal: [] },
};
const f = ward => ({ ward });

// [description, ward, clinic, day, expected]
const CASES = [
  // no clinic: the day is about opening hours, so a 24/7 facility always shows
  ['any clinic, any day',                      'OGIJO',   '',             '',    true],
  ['any clinic, Friday (no clinics that day)', 'OGIJO',   '',             'Fri', true],
  ['any clinic, Sunday',                       'EMPTY',   '',             'Sun', true],
  ['any clinic, ward with no clinic data',     'UNKNOWN', '',             'Fri', true],

  // clinic only: ward must run that clinic on some day
  ['immunization, any day',                    'OGIJO',   'immunization', '',    true],
  ['antenatal, any day',                       'AGBOWA',  'antenatal',    '',    true],
  ['immunization, ward has none',              'EMPTY',   'immunization', '',    false],
  ['antenatal, ward missing from data',        'UNKNOWN', 'antenatal',    '',    false],

  // clinic + day: the day is that clinic's day in the ward
  ['immunization on its day',                  'OGIJO',   'immunization', 'Tue', true],
  ['immunization on antenatal-only day',       'OGIJO',   'immunization', 'Mon', false],
  ['antenatal on its day',                     'OGIJO',   'antenatal',    'Thu', true],
  ['antenatal on immunization-only day',       'OGIJO',   'antenatal',    'Wed', false],
  ['antenatal on Friday',                      'OGIJO',   'antenatal',    'Fri', false],
  ['antenatal on weekend',                     'AGBOWA',  'antenatal',    'Sat', false],
  ['clinic + day, ward missing from data',     'UNKNOWN', 'antenatal',    'Mon', false],
];

for (const [name, ward, clinic, day, expected] of CASES) {
  test(name, () => {
    assert.equal(facilitiesForClinic(f(ward), clinic, day, SETTINGS, CLINICS), expected);
  });
}

test('a day with no opening hours hides facilities when no clinic is selected', () => {
  const settings = { opening_hours_global: { ...ALL_WEEK, Sun: '' } };
  assert.equal(facilitiesForClinic(f('OGIJO'), '', 'Sun', settings, CLINICS), false);
  assert.equal(facilitiesForClinic(f('OGIJO'), '', 'Sat', settings, CLINICS), true);
});

test('missing settings or clinics data does not throw', () => {
  assert.equal(facilitiesForClinic(f('OGIJO'), '', 'Mon', undefined, undefined), false);
  assert.equal(facilitiesForClinic(f('OGIJO'), 'antenatal', '', undefined, undefined), false);
  assert.equal(facilitiesForClinic(f('OGIJO'), '', '', undefined, undefined), true);
});

test('real data: counts per clinic and day', () => {
  const rows = require('./data/phcs.json');
  const settings = require('./data/settings.json');
  const clinics = require('./data/clinics_by_ward.json');
  const count = (clinic, day) => rows.filter(r => facilitiesForClinic(r, clinic, day, settings, clinics)).length;
  assert.equal(count('', 'Fri'), rows.length);
  assert.equal(count('antenatal', 'Fri'), 0);
  assert.equal(count('antenatal', 'Thu'), 7);
  assert.equal(count('immunization', 'Wed'), 23);
  assert.equal(count('antenatal', 'Wed'), 0);
});

test('real data: every facility ward has clinic data', () => {
  const rows = require('./data/phcs.json');
  const clinics = require('./data/clinics_by_ward.json');
  const missing = [...new Set(rows.map(r => r.ward))].filter(w => !(w in clinics));
  assert.deepEqual(missing, []);
});
