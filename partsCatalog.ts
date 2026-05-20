function sizeCode(size: string) {
  return size.replace(".", "");
}

function numericSize(size: string) {
  const value = Number(size);
  return Number.isFinite(value) ? String(value).replace(/\.0$/, "") : size;
}

function getFlangeModel(material: string, size: string) {
  const n = numericSize(size);
  if (material === "PP" || material === "PP80") return n === "1" ? "/models/Flange_PP.STL" : `/models/Flange_PP${n}.STL`;
  if (material === "SS") return n === "1.25" ? "/models/Flange_SS1.STL" : `/models/Flange_SS${n}.STL`;
  if (n === "1.25") return "/models/Flange_1.25Flange.STL";
  if (Number(size) < 1) return "/models/Flange.STL";
  return `/models/Flange_${n}.STL`;
}

function getExpansionModel(size: string) {
  const expansionSize = nearestAllowedSize(size, ["1.00", "1.25", "1.50", "2.00", "2.50", "3.00", "4.00", "5.00", "6.00", "8.00", "10.00", "12.00", "14.00", "16.00", "18.00", "20.00", "24.00"]);
  return `/models/Expansion Jonts_A.FEJ0${sizeCode(expansionSize)}.STL`;
}

const ASSMANN_ACCESSORIES_URL = "https://assmann-usa.com/tank-accessories/common-accessories/";
const DEFAULT_FALLBACK_NOTE = "Local STL fallback enabled. If this exact model is missing, the configurator keeps the BOM row and uses generated rough geometry based on the selected accessory rules.";

const RULES = {
  vent: "Vent assemblies are top-mounted accessories and require a bulkhead or flange base. Allowed vent sizes: 2, 3, 4, and 6 in.",
  fillLine: "Fill line assemblies mount from the top and require a separate bulkhead or flange base. Allowed fill line sizes: 1, 2, 3, and 4 in.",
  antiFoam: "Anti-foam elbows attach to the fill connection and require the fill-line base. Allowed sizes: 1, 2, 3, and 4 in.",
  outlet: "Outlet bases may be placed on the side wall or top. Valves, siphons, and plugs remain child BOM items attached to the outlet base.",
  extra: "Extra flanges/bulkheads may be side or top mounted. Any plug remains attached to that base.",
  levelSightGauge: "Sight gauges are side-mounted level accessories.",
  levelReverseFloat: "Reverse float indicators are top-mounted accessories and avoid sidewall penetration.",
};

function nearestAllowedSize(size: string, allowed: string[]) {
  if (allowed.includes(size)) return size;
  const n = Number(size);
  if (!Number.isFinite(n)) return allowed[0];
  return allowed.reduce((best, current) => {
    return Math.abs(Number(current) - n) < Math.abs(Number(best) - n) ? current : best;
  }, allowed[0]);
}

function sizeNumber(size: string) {
  const parsed = Number(size);
  return Number.isFinite(parsed) ? parsed : 2;
}

function baseScale(size: string) {
  const n = sizeNumber(size);
  if (n <= 0.5) return 0.008;
  if (n <= 1) return 0.012;
  if (n <= 1.5) return 0.016;
  if (n <= 2) return 0.020;
  if (n <= 3) return 0.026;
  if (n <= 4) return 0.032;
  if (n <= 6) return 0.045;
  return 0.035;
}

function accessoryScale(size: string) {
  const n = sizeNumber(size);
  if (n <= 1) return 0.008;
  if (n <= 1.5) return 0.010;
  if (n <= 2) return 0.012;
  if (n <= 3) return 0.016;
  if (n <= 4) return 0.020;
  if (n <= 6) return 0.028;
  return 0.016;
}

function getBaseModel(type: string, material: string, size: string) {
  const sz = sizeCode(size);

  if (type === "B") {
    if (material === "PVC" || material === "PVC40" || material === "PVC80") return `/models/A.BHPV${sz}.STL`;
    if (material === "PP" || material === "PP80") return `/models/A.BHPP${sz}.STL`;
    if (material === "CPVC" || material === "CPVC80") return `/models/A.BHCP${sz}.STL`;
    return `/models/A.BHPV${sz}.STL`;
  }

  if (type === "F") {
    return getFlangeModel(material, size);
  }

  if (type === "M") {
    return `/models/Metalic Double Male_A.SDM${sz}.STL`;
  }

  return "/models/outlet.STL";
}

function getVentModel(size: string) {
  if (size === "2.00") return "/models/A.UV80PP200.STL";
  if (size === "3.00") return "/models/A.UV80PP300.STL";
  if (size === "4.00") return "/models/A.UV80PP400.STL";
  if (size === "6.00") return "/models/vent_4in.STL";
  return "/models/vent_4in.STL";
}

function getMushroomVentModel(size: string) {
  if (size === "1.00") return "/models/Mushroom Vent_A.MVPP100.STL";
  if (size === "2.00") return "/models/Mushroom Vent_A.MVPP200.STL";
  if (size === "3.00") return "/models/Mushroom Vent_A.MVPP300.STL";
  return "/models/Mushroom Vent.STL";
}

function getFillLineModel(size: string) {
  if (size === "2.00") return "/models/2 PP Fill Line Proposal.STL";
  return "/models/A.FLPPSEE200.STL";
}

function getAntiFoamModel(size: string) {
  if (size === "0.50") return "/models/A.AFEPV050.STL";
  if (size === "0.75") return "/models/A.AFEPV075.STL";
  if (size === "1.00") return "/models/A.AFEPV100.STL";
  if (size === "2.00") return "/models/A.AFEPV200.STL";
  if (size === "3.00") return "/models/A.AFEPV300.STL";
  return "/models/A.AFEPV200.STL";
}

function getLevelModel(levelType: string) {
  if (levelType === "RF") return "/models/A.R-FLOAT.STL";
  if (levelType === "SG") return "/models/A.SGA075-1.STL";
  return "/models/outlet.STL";
}

function getValveModel(size: string) {
  return `/models/True Union Ball Valve_A.BVTUPV${sizeCode(size)}.STL`;
}

function getPlugModel(size: string) {
  if (size === "2.00") return "/models/2 cap.STL";
  return "/models/7 threaded cap.STL";
}

function makeVisualPart({
  mark,
  category,
  role,
  attachedTo,
  size,
  itemNumber,
  description,
  modelPath,
  deg,
  elev,
  mount = "SIDE",
  render = true,
  scale = 1,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  lockedToSurface = true,
  preferProcedural = true,
  allowedMounts = ["SIDE", "TOP"],
  allowedSizes = [],
  requiresBase = false,
  allowedBaseTypes = [],
  mountLocked = false,
  ruleNote = "",
  sourceUrl = ASSMANN_ACCESSORIES_URL,
  fallbackNote = DEFAULT_FALLBACK_NOTE,
}: any) {
  const safeMount = allowedMounts.includes(mount) ? mount : allowedMounts[0];

  return {
    mark,
    category,
    role,
    attachedTo: attachedTo || null,
    size: size === "-" ? "-" : `${size}\"`,
    rawSize: size,
    itemNumber,
    description,
    modelPath,
    sourceUrl,
    fallbackNote,
    deg,
    elev,
    mount: safeMount,
    render,
    scale: preferProcedural ? 1 : scale,
    preferProcedural,
    rotX,
    rotY,
    rotZ,
    lockedToSurface,
    allowedMounts,
    allowedSizes,
    requiresBase,
    allowedBaseTypes,
    mountLocked,
    ruleNote,
    collision: false,
    highlighted: false,
  };
}

export function makeOutletParts(values: string[], deg = 0, elev = 6) {
  const [baseType, material, bolts, seals, selectedSize, valve, siphon, plug, expansion = "N"] = values;
  if (baseType === "N") return [];

  const size = selectedSize;
  const baseMark = "B1";

  const parts: any[] = [
    makeVisualPart({
      mark: baseMark,
      category: baseType === "F" ? "Outlet Flange Base" : baseType === "M" ? "Outlet Metallic Adapter Base" : "Outlet Bulkhead Base",
      role: "BASE",
      size,
      itemNumber: baseType === "F" ? `FL-${material}-${size}` : baseType === "M" ? `SDM-${material}-${size}` : `BH-${material}-${size}`,
      description:
        baseType === "F"
          ? `${size}\" ${material} flange base / ${seals}, ${bolts} bolts`
          : baseType === "M"
            ? `${size}\" metallic adapter base / ${seals}, ${bolts} bolts`
            : `${size}\" ${material} bulkhead base / ${seals}`,
      modelPath: getBaseModel(baseType, material, size),
      deg,
      elev,
      mount: "SIDE",
      scale: baseScale(size),
      render: true,
      allowedMounts: ["SIDE", "TOP"],
      ruleNote: RULES.outlet,
    }),
  ];

  let childNumber = 2;

  if (valve !== "N") {
    parts.push(
      makeVisualPart({
        mark: `B${childNumber++}`,
        category: "Outlet Valve",
        role: "CHILD",
        attachedTo: baseMark,
        size,
        itemNumber: `VALVE-${valve}-${size}`,
        description: `${size}\" ${valve} valve attached to ${baseMark}`,
        modelPath: getValveModel(size),
        deg,
        elev,
        mount: "SIDE",
        render: true,
        preferProcedural: true,
        allowedMounts: ["SIDE", "TOP"],
        requiresBase: true,
        allowedBaseTypes: ["B", "F"],
        ruleNote: "Valve is a child accessory and follows the outlet base.",
      })
    );
  }

  if (siphon !== "N") {
    parts.push(
      makeVisualPart({
        mark: `B${childNumber++}`,
        category: "Siphon Drain",
        role: "CHILD",
        attachedTo: baseMark,
        size,
        itemNumber: `SIPHON-${siphon}-${size}`,
        description: `${size}\" ${siphon} siphon drain attached to ${baseMark}`,
        modelPath: "/models/Siphon drain.STL",
        deg,
        elev,
        mount: "SIDE",
        render: true,
        allowedMounts: ["SIDE"],
        requiresBase: true,
        allowedBaseTypes: ["B", "F"],
        ruleNote: "Siphon drain is a BOM/accessory item attached to the outlet base.",
      })
    );
  }

  if (plug !== "N") {
    parts.push(
      makeVisualPart({
        mark: `B${childNumber++}`,
        category: "Outlet Plug",
        role: "CHILD",
        attachedTo: baseMark,
        size,
        itemNumber: `PLUG-${plug}-${size}`,
        description: `${size}\" ${plug} threaded plug attached to ${baseMark}`,
        modelPath: getPlugModel(size),
        deg,
        elev,
        mount: "SIDE",
        render: true,
        allowedMounts: ["SIDE", "TOP"],
        requiresBase: true,
        allowedBaseTypes: ["B", "F"],
        ruleNote: "Plug is a child accessory attached to the selected base.",
      })
    );
  }

  if (expansion !== "N") {
    parts.push(
      makeVisualPart({
        mark: `B${childNumber++}`,
        category: "Expansion Joint",
        role: "CHILD",
        attachedTo: baseMark,
        size,
        itemNumber: `FEJ-${size}`,
        description: `${size}\" flexible expansion joint attached to ${baseMark}`,
        modelPath: getExpansionModel(size),
        deg,
        elev,
        mount: "SIDE",
        render: true,
        allowedMounts: ["SIDE", "TOP"],
        requiresBase: true,
        allowedBaseTypes: ["B", "F", "M"],
        ruleNote: "Expansion joint is a child accessory attached outside the outlet base.",
      })
    );
  }

  return parts;
}

export function makeFillLineParts(values: string[], deg = 45, elev = 20) {
  const [baseType, material, bolts, seals, selectedSize, accessory = "FILL"] = values;
  if (accessory === "N") return [];

  const fillSize = nearestAllowedSize(selectedSize, ["1.00", "2.00", "3.00", "4.00"]);
  const antiFoamSize = nearestAllowedSize(selectedSize, ["1.00", "2.00", "3.00", "4.00"]);
  const size = accessory === "AFE" ? antiFoamSize : fillSize;
  const baseMark = "C1";
  const mount = "TOP";

  const parts: any[] = [
    makeVisualPart({
      mark: baseMark,
      category: baseType === "F" ? "Fill Line Flange Base" : "Fill Line Bulkhead Base",
      role: "BASE",
      size,
      itemNumber: baseType === "F" ? `FL-${material}-${size}` : `BH-${material}-${size}`,
      description:
        baseType === "F"
          ? `${size}\" ${material} flange base for fill line`
          : `${size}\" ${material} bulkhead base for fill line`,
      modelPath: getBaseModel(baseType, material, size),
      deg,
      elev,
      mount,
      scale: baseScale(size),
      render: true,
      allowedMounts: ["TOP"],
      mountLocked: true,
      requiresBase: false,
        allowedSizes: ["1.00", "2.00", "3.00", "4.00"],
      allowedBaseTypes: ["B", "F"],
      ruleNote: RULES.fillLine,
    }),
  ];

  if (accessory === "FILL" || accessory === "FILL_AFE") {
    parts.push(
      makeVisualPart({
        mark: "C2",
        category: "Fill Line",
        role: "CHILD",
        attachedTo: baseMark,
        size: fillSize,
        itemNumber: `FILL-${material}-${fillSize}`,
        description: `${fillSize}\" ${material} fill line attached to ${baseMark}`,
        modelPath: getFillLineModel(fillSize),
        deg,
        elev,
        mount,
        scale: accessoryScale(fillSize),
        render: true,
        allowedMounts: ["TOP"],
        mountLocked: true,
        requiresBase: true,
        allowedSizes: ["1.00", "2.00", "3.00", "4.00"],
        allowedBaseTypes: ["B", "F"],
        ruleNote: RULES.fillLine,
      })
    );
  }

  if (accessory === "AFE" || accessory === "FILL_AFE") {
    parts.push(
      makeVisualPart({
        mark: accessory === "FILL_AFE" ? "C3" : "C2",
        category: "Anti-Foam Elbow",
        role: "CHILD",
        attachedTo: baseMark,
        size: antiFoamSize,
        itemNumber: `AFE-${material}-${antiFoamSize}`,
        description: `${antiFoamSize}\" ${material} anti-foam elbow attached to ${baseMark}`,
        modelPath: getAntiFoamModel(antiFoamSize),
        deg,
        elev,
        mount,
        scale: accessoryScale(antiFoamSize),
        render: true,
        allowedMounts: ["TOP"],
        mountLocked: true,
        requiresBase: true,
        allowedSizes: ["1.00", "2.00", "3.00", "4.00"],
        allowedBaseTypes: ["B", "F"],
        ruleNote: RULES.antiFoam,
      })
    );
  }

  return parts;
}

export function makeExtraFittingParts(values: string[], baseMark = "D1", deg = 180, elev = 30) {
  const [baseType, material, bolts, seals, size, plug] = values;
  if (baseType === "N") return [];

  const parts: any[] = [
    makeVisualPart({
      mark: baseMark,
      category: baseType === "F" ? "Extra Flange Base" : baseType === "M" ? "Extra Metallic Adapter Base" : "Extra Bulkhead Base",
      role: "BASE",
      size,
      itemNumber: baseType === "F" ? `FL-${material}-${size}` : baseType === "M" ? `SDM-${material}-${size}` : `BH-${material}-${size}`,
      description:
        baseType === "F"
          ? `${size}\" ${material} extra flange / ${seals}`
          : baseType === "M"
            ? `${size}\" metallic adapter / ${seals}`
            : `${size}\" ${material} extra bulkhead / ${seals}`,
      modelPath: getBaseModel(baseType, material, size),
      deg,
      elev,
      mount: "SIDE",
      scale: baseScale(size),
      render: true,
      allowedMounts: ["SIDE", "TOP"],
      ruleNote: RULES.extra,
    }),
  ];

  if (plug !== "N") {
    parts.push(
      makeVisualPart({
        mark: `${baseMark.replace("1", "2")}`,
        category: "Extra Plug",
        role: "CHILD",
        attachedTo: baseMark,
        size,
        itemNumber: `PLUG-${plug}-${size}`,
        description: `${size}\" ${plug} plug attached to ${baseMark}`,
        modelPath: getPlugModel(size),
        deg,
        elev,
        mount: "SIDE",
        render: true,
        allowedMounts: ["SIDE", "TOP"],
        requiresBase: true,
        allowedBaseTypes: ["B", "F"],
        ruleNote: "Plug is a child accessory attached to the extra fitting base.",
      })
    );
  }

  return parts;
}

export function makeVentParts(values: string[], deg = 315, elev = 22) {
  const [type, material, bolts, seals, selectedSize, screen] = values;
  if (type === "N") return [];

  const size = nearestAllowedSize(selectedSize, ["2.00", "3.00", "4.00", "6.00"]);
  const baseMark = "F1";
  const baseType = type === "UVF" || type === "MVF" ? "F" : "B";
  const ventLabel = type.startsWith("UV") ? "U-Vent" : "Mushroom Vent";

  const parts = [
    makeVisualPart({
      mark: baseMark,
      category: baseType === "F" ? "Vent Flange Base" : "Vent Bulkhead Base",
      role: "BASE",
      size,
      itemNumber: `${baseType === "F" ? "FL" : "BH"}-${material}-${size}`,
      description: `${size}\" ${baseType === "F" ? "flange" : "bulkhead"} base required for ${ventLabel}`,
      modelPath: getBaseModel(baseType, "PVC", size),
      deg,
      elev,
      mount: "TOP",
      scale: baseScale(size),
      render: true,
      allowedMounts: ["TOP"],
      mountLocked: true,
      allowedSizes: ["2.00", "3.00", "4.00", "6.00"],
      allowedBaseTypes: ["B", "F"],
      ruleNote: RULES.vent,
    }),
    makeVisualPart({
      mark: "F2",
      category: ventLabel,
      role: "CHILD",
      attachedTo: baseMark,
      size,
      itemNumber: `VENT-${type}-${size}`,
      description: `${size}\" ${material} ${ventLabel} attached to ${baseMark}`,
      modelPath: type.startsWith("UV") ? getVentModel(size) : getMushroomVentModel(size),
      deg,
      elev,
      mount: "TOP",
      scale: accessoryScale(size),
      render: true,
      allowedMounts: ["TOP"],
      mountLocked: true,
      requiresBase: true,
      allowedSizes: ["2.00", "3.00", "4.00", "6.00"],
      allowedBaseTypes: ["B", "F"],
      ruleNote: RULES.vent,
    }),
  ];

  if (screen !== "N") {
    parts.push(
      makeVisualPart({
        mark: "F3",
        category: "Vent Screen",
        role: "CHILD",
        attachedTo: "F2",
        size,
        itemNumber: `SCREEN-${screen}-${size}`,
        description: `${size}\" ${screen} screen for ${ventLabel}`,
        modelPath: "/models/PVC Sch80 Coupling SxS 2_2.STL",
        deg,
        elev,
        mount: "TOP",
        render: true,
        allowedMounts: ["TOP"],
        mountLocked: true,
        requiresBase: true,
        allowedBaseTypes: ["B", "F"],
        ruleNote: "Vent screens are BOM child items for the vent assembly.",
      })
    );
  }

  return parts;
}

export function makeLevelParts(values: string[], deg = 270, elev = 50) {
  const [levelType, material, bolts, seals] = values;
  if (levelType === "N") return [];

  const isReverseFloat = levelType === "RF";

  return [
    makeVisualPart({
      mark: "G1",
      category: isReverseFloat ? "Reverse Float Level" : "Sight Gauge Level",
      role: "BASE",
      size: "-",
      itemNumber: isReverseFloat ? "A.R-FLOAT" : "A.SIGHTGAUGE",
      description: isReverseFloat ? "Reverse Acting Float Level Indicator" : "Sight Gauge Manual Level Indicator",
      modelPath: getLevelModel(levelType),
      deg,
      elev,
      mount: isReverseFloat ? "TOP" : "SIDE",
      scale: 0.018,
      render: true,
      allowedMounts: isReverseFloat ? ["TOP"] : ["SIDE"],
      mountLocked: true,
      ruleNote: isReverseFloat ? RULES.levelReverseFloat : RULES.levelSightGauge,
    }),
  ];
}
