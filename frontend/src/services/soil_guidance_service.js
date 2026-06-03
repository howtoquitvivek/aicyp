/**
 * Soil Guidance Service
 * 
 * Provides agriculturally defensible reference ranges for N, P, K, and pH 
 * based on soil type and region. These are intended to be used as Reference Ranges 
 * and should NEVER be passed as actual measured values without user confirmation.
 */

const SOIL_REFERENCE_DATA = {
  'Alluvial': {
    n_range: '70–100',
    p_range: '30–50',
    k_range: '30–60',
    ph_range: '6.5–7.5',
    description: 'Based on common values for Alluvial soils.'
  },
  'Black': {
    n_range: '50–80',
    p_range: '20–40',
    k_range: '40–70',
    ph_range: '7.2–8.5',
    description: 'Based on common values for Black (Regur) soils.'
  },
  'Red': {
    n_range: '40–70',
    p_range: '20–40',
    k_range: '20–40',
    ph_range: '5.5–6.8',
    description: 'Based on common values for Red soils.'
  },
  'Laterite': {
    n_range: '30–50',
    p_range: '10–30',
    k_range: '10–30',
    ph_range: '4.5–6.0',
    description: 'Based on common values for Laterite soils.'
  },
  'Sandy': {
    n_range: '20–40',
    p_range: '10–20',
    k_range: '10–30',
    ph_range: '6.0–7.0',
    description: 'Based on common values for Sandy soils.'
  },
  'Clay': {
    n_range: '60–90',
    p_range: '30–50',
    k_range: '40–60',
    ph_range: '6.8–7.8',
    description: 'Based on common values for Clay soils.'
  },
  'Loamy': {
    n_range: '60–100',
    p_range: '30–50',
    k_range: '40–70',
    ph_range: '6.5–7.5',
    description: 'Based on common values for Loamy soils.'
  },
  'Silt': {
    n_range: '50–80',
    p_range: '20–40',
    k_range: '30–50',
    ph_range: '6.5–7.5',
    description: 'Based on common values for Silt soils.'
  }
};

const DEFAULT_RANGE = {
  n_range: '50–100',
  p_range: '20–50',
  k_range: '20–60',
  ph_range: '6.0–7.5',
  description: 'Generic reference range.'
};

/**
 * Returns reference ranges for a given soil type.
 * @param {string} soilType 
 * @returns {Object} n_range, p_range, k_range, ph_range, description
 */
export const getSoilReferenceRanges = (soilType) => {
  if (!soilType) return DEFAULT_RANGE;
  
  // Try to find a case-insensitive match
  const searchType = soilType.toLowerCase() === 'clayey' ? 'clay' : soilType.toLowerCase();
  const match = Object.keys(SOIL_REFERENCE_DATA).find(
    (k) => k.toLowerCase() === searchType
  );
  
  return match ? SOIL_REFERENCE_DATA[match] : DEFAULT_RANGE;
};

export default {
  getSoilReferenceRanges
};
