// Without a clinic selected, the day filter is about the facility being open (opening hours).
// With a clinic selected, it narrows to wards where that clinic runs (on the chosen day, if any).
// clinic: '' | 'immunization' | 'antenatal'; selectedDay: '' (any) or a weekday.
(function (root) {
  function facilitiesForClinic(f, clinic, selectedDay, settings, clinics) {
    if (!clinic) {
      if (!selectedDay) return true;
      return !!((settings || {}).opening_hours_global || {})[selectedDay];
    }
    const days = ((clinics || {})[f.ward] || {})[clinic] || [];
    return selectedDay ? days.includes(selectedDay) : days.length > 0;
  }

  const api = { facilitiesForClinic };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ClinicFilter = api;
})(typeof window !== 'undefined' ? window : globalThis);
