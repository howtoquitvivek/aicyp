"""
Crop Normalization Layer for AGMARKNET API integration.
Maps standard clean application crop names to AGMARKNET commodity strings.
"""

# The mapping from UI display name to an array of AGMARKNET search strings.
# Order matters: higher confidence matches should appear first.
AGMARKNET_CROP_MAPPING = {
    "Rice": [
        "Paddy(Dhan)(Common)",
        "Paddy(Dhan)(Basmati)",
        "Rice"
    ],
    "Wheat": [
        "Wheat"
    ],
    "Cotton": [
        "Cotton"
    ],
    "Soybean": [
        "Soyabean",
        "Soybean"
    ]
}

def get_agmarknet_commodities(ui_crop_name: str) -> list[str]:
    """
    Given a UI crop name, return a list of AGMARKNET commodity names to search for.
    If the crop is not explicitly mapped, it returns the crop name itself as a fallback.
    """
    # Normalize input for matching (e.g. "soybean" -> "Soybean")
    for mapped_crop, variants in AGMARKNET_CROP_MAPPING.items():
        if mapped_crop.lower() == ui_crop_name.strip().lower():
            return variants
            
    # Default fallback: return the exact string they requested
    return [ui_crop_name.strip()]

def normalize_agmarknet_commodity(agmarknet_commodity: str) -> str:
    """
    Reverse map an AGMARKNET commodity string back to a clean UI crop name.
    """
    for mapped_crop, variants in AGMARKNET_CROP_MAPPING.items():
        if agmarknet_commodity.lower() in [v.lower() for v in variants]:
            return mapped_crop
            
    return agmarknet_commodity
