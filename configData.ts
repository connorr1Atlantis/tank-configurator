const opt = (value: string, label: string) => ({ value, label });

export const tankInfo = {
  labels: ["Type", "Size (gal)", "Specific Gravity", "Material", "Label"],
  values: [
    [opt("ICT", "Single Wall"), opt("IMT", "Double Wall"), opt("ICB", "Cone Bottom")],
    ["550", "1000", "1050", "1500", "2000", "3000", "5500", "10000"],
    ["1.35", "1.5", "1.9", "2.2"],
    [opt("L", "Linear Poly"), opt("X", "Crosslink"), opt("LX", "Linear Lined Crosslink")],
    [opt("N", "None"), opt("S", "Stencil"), opt("E", "Engraved")],
  ],
};

export const fillLineInfo = {
  labels: ["Base Type", "Material", "Bolts", "Seals", "Size (in)", "Accessory"],
  values: [
    [opt("F", "Flange Base"), opt("B", "Bulkhead Base")],
    [opt("PVC", "PVC"), opt("CPVC", "CPVC"), opt("PP", "Polypropylene")],
    [opt("SS", "Stainless"), opt("TTN", "Titanium"), opt("HAST", "Hastelloy")],
    [opt("EPDM", "EPDM"), opt("VITON", "Viton"), opt("BUNA", "Buna")],
    ["1.00", "2.00", "3.00", "4.00"],
    [opt("FILL", "Fill Line Assembly"), opt("AFE", "Anti-Foam Elbow"), opt("FILL_AFE", "Fill Line + Anti-Foam Elbow"), opt("N", "None")],
  ],
};

export const outletInfo = {
  labels: ["Type", "Material", "Bolts", "Seals", "Size (in)", "Valve", "Siphon Drain", "Plug", "Expansion Joint"],
  values: [
    [opt("F", "Flange"), opt("B", "Bulkhead"), opt("M", "Metallic"), opt("D", "Double Wall"), opt("N", "None")],
    [opt("PVC", "PVC"), opt("CPVC", "CPVC"), opt("PP", "Polypropylene"), opt("SS", "Stainless"), opt("TTN", "Titanium")],
    [opt("SS", "Stainless"), opt("TTN", "Titanium"), opt("HAST", "Hastelloy")],
    [opt("EPDM", "EPDM"), opt("VITON", "Viton"), opt("BUNA", "Buna")],
    ["0.50", "1.00", "1.50", "2.00", "3.00", "4.00"],
    [opt("N", "None"), opt("PVC-TU", "PVC True Union"), opt("PVC-CB", "PVC Chem Ball"), opt("CPVC-TU", "CPVC True Union")],
    [opt("N", "None"), opt("PVC", "PVC"), opt("CPVC", "CPVC"), opt("PP", "Polypropylene"), opt("SS", "Stainless")],
    [opt("N", "None"), opt("PVC", "PVC Plug"), opt("CPVC", "CPVC Plug"), opt("PP", "PP Plug")],
    [opt("N", "None"), opt("FEJ", "Flexible Expansion Joint")],
  ],
};

export const extraFittingInfo = {
  labels: ["Type", "Material", "Bolts", "Seals", "Size (in)", "Plug"],
  values: [
    [opt("F", "Flange"), opt("B", "Bulkhead"), opt("M", "Metallic"), opt("N", "None")],
    [opt("PVC", "PVC"), opt("CPVC", "CPVC"), opt("PP", "Polypropylene"), opt("SS", "Stainless")],
    [opt("SS", "Stainless"), opt("TTN", "Titanium"), opt("HAST", "Hastelloy")],
    [opt("EPDM", "EPDM"), opt("VITON", "Viton"), opt("BUNA", "Buna")],
    ["0.50", "1.00", "2.00", "3.00", "4.00"],
    [opt("N", "None"), opt("PVC", "PVC Plug"), opt("CPVC", "CPVC Plug"), opt("PP", "PP Plug")],
  ],
};

export const ventInfo = {
  labels: ["Type", "Material", "Bolts", "Seals", "Size (in)", "Screen"],
  values: [
    [opt("UVB", "U-Vent with Bulkhead Base"), opt("UVF", "U-Vent with Flange Base"), opt("MVB", "Mushroom Vent with Bulkhead Base"), opt("MVF", "Mushroom Vent with Flange Base"), opt("N", "None")],
    [opt("PVC40", "PVC SCH40"), opt("PVC80", "PVC SCH80"), opt("CPVC80", "CPVC SCH80"), opt("PP80", "PP SCH80")],
    [opt("SS", "Stainless"), opt("TTN", "Titanium"), opt("HAST", "Hastelloy")],
    [opt("EPDM", "EPDM"), opt("VITON", "Viton")],
    ["2.00", "3.00", "4.00", "6.00"],
    [opt("N", "None"), opt("SS", "Stainless Screen"), opt("PE", "Poly Screen")],
  ],
};

export const levelInfo = {
  labels: ["Type", "Material", "Bolts", "Seals"],
  values: [
    [opt("SG", "Sight Gauge"), opt("RF", "Reverse Float"), opt("N", "None")],
    [opt("PVC", "PVC"), opt("CPVC", "CPVC"), opt("PP", "Polypropylene")],
    [opt("SS", "Stainless"), opt("TTN", "Titanium")],
    [opt("EPDM", "EPDM"), opt("VITON", "Viton")],
  ],
};

export const additionalOptionsInfo = {
  labels: ["Color", "Heat Tracing", "Insulation", "Ladder"],
  values: [
    [opt("N", "Standard"), opt("BLK", "Black"), opt("RED", "Red"), opt("YEL", "Yellow")],
    [opt("N", "None"), opt("50", "Delta T 50"), opt("80", "Delta T 80")],
    [opt("N", "None"), opt("1", '1"'), opt("2", '2"')],
    [opt("N", "None"), opt("L", "Ladder"), opt("LP", "Ladder + Platform")],
  ],
};
