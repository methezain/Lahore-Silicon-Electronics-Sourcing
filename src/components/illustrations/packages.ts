/**
 * Isometric package drawings for a missing photograph and for empty states.
 * Stroke is 1.5px (`vector-effect: non-scaling-stroke`). Body lines use
 * `currentColor`. Each drawing has one `signal` accent.
 *
 * Lead counts follow the package, not a particular lot:
 * TO-220 and TO-92 are 3-lead; SOT-223 is 3 gull wings plus the tab;
 * DIP-8 is 4 + 4 at 2.54 mm, rows 7.62 mm apart.
 * The module PCB is a generic board with a 1×4 header (2.54 mm).
 * The relay module matches the shop photograph of SRD-05VDC-SL-C:
 * a 3-pin header and three contact screws.
 */

export const PACKAGE_KINDS = ["to-220", "to-92", "sot-223", "dip-8", "module", "relay"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const PACKAGE_SHEET: readonly { kind: PackageKind; title: string; detail: string }[] = [
  { kind: "to-220", title: "TO-220", detail: "3 leads" },
  { kind: "to-92", title: "TO-92", detail: "3 leads" },
  { kind: "sot-223", title: "SOT-223", detail: "3 leads and 1 tab" },
  { kind: "dip-8", title: "DIP-8", detail: "8 leads" },
  { kind: "module", title: "Module PCB", detail: "4-pin header" },
  { kind: "relay", title: "Relay module", detail: "3-pin header, 3 contact screws" },
];

const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

type Pt = readonly [number, number, number];

type Shape = {
  d: string;
  pin?: number;
  contact?: number;
  accent?: boolean;
  /** Occludes lines behind a face. Same color as the sunken well. */
  fill?: boolean;
  points: [number, number][];
};

function proj([x, y, z]: Pt): [number, number] {
  return [(x - y) * COS, (x + y) * SIN - z];
}

function num(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

class Mesh {
  private readonly seen = new Set<string>();
  private readonly segs: string[] = [];
  readonly points: [number, number][] = [];

  edge(a: Pt, b: Pt) {
    const key = [a, b]
      .map((point) => point.map((value) => value.toFixed(3)).join(","))
      .sort()
      .join("|");
    if (this.seen.has(key)) return;
    this.seen.add(key);
    const start = proj(a);
    const end = proj(b);
    this.points.push(start, end);
    this.segs.push(`M${num(start[0])} ${num(start[1])}L${num(end[0])} ${num(end[1])}`);
  }

  /** Closed loop, or an open chain when `closed` is false. */
  chain(points: readonly Pt[], closed = true) {
    const count = closed ? points.length : points.length - 1;
    for (let index = 0; index < count; index += 1) {
      this.edge(points[index], points[(index + 1) % points.length]);
    }
  }

  toShape(meta: Omit<Shape, "d" | "points"> = {}): Shape {
    return { d: this.segs.join(""), points: this.points, ...meta };
  }
}

/** Top, front (max y), and right (max x). Those are the faces this projection shows. */
function solid(x: number, y: number, z: number, w: number, depth: number, h: number): Shape[] {
  const mesh = new Mesh();
  box(mesh, x, y, z, w, depth, h);
  return [
    face([
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + depth, z + h],
      [x, y + depth, z + h],
    ]),
    face([
      [x, y + depth, z],
      [x + w, y + depth, z],
      [x + w, y + depth, z + h],
      [x, y + depth, z + h],
    ]),
    face([
      [x + w, y, z],
      [x + w, y + depth, z],
      [x + w, y + depth, z + h],
      [x + w, y, z + h],
    ]),
    mesh.toShape(),
  ];
}

function box(mesh: Mesh, x: number, y: number, z: number, w: number, depth: number, h: number) {
  mesh.chain([
    [x, y, z + h],
    [x + w, y, z + h],
    [x + w, y + depth, z + h],
    [x, y + depth, z + h],
  ]);
  mesh.chain([
    [x, y + depth, z],
    [x + w, y + depth, z],
    [x + w, y + depth, z + h],
    [x, y + depth, z + h],
  ]);
  mesh.chain([
    [x + w, y, z],
    [x + w, y + depth, z],
    [x + w, y + depth, z + h],
    [x + w, y, z + h],
  ]);
}

function circle(mesh: Mesh, center: Pt, axis: "front" | "top", radius: number, steps = 20) {
  const points: Pt[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    const cos = Math.cos(angle) * radius;
    const sin = Math.sin(angle) * radius;
    if (axis === "front") points.push([center[0] + cos, center[1], center[2] + sin]);
    else points.push([center[0] + cos, center[1] + sin, center[2]]);
  }
  mesh.chain(points, false);
}

function tombstone(y: number, width: number, shoulder: number, steps = 14): Pt[] {
  const radius = width / 2;
  const center = width / 2;
  const points: Pt[] = [
    [0, y, 0],
    [0, y, shoulder],
  ];
  for (let index = 1; index < steps; index += 1) {
    const angle = Math.PI - (index / steps) * Math.PI;
    points.push([
      center + radius * Math.cos(angle),
      y,
      shoulder + radius * Math.sin(angle),
    ]);
  }
  points.push([width, y, shoulder], [width, y, 0]);
  return points;
}

function lead(
  x: number,
  y: number,
  top: number,
  length: number,
  width: number,
  thickness: number,
): Mesh {
  const mesh = new Mesh();
  box(mesh, x, y, top - length, width, thickness, length);
  return mesh;
}

function face(points: readonly Pt[], meta: Omit<Shape, "d" | "points"> = {}): Shape {
  const projected = points.map((point) => proj(point));
  const d = `${projected
    .map((point, index) => `${index === 0 ? "M" : "L"}${num(point[0])} ${num(point[1])}`)
    .join("")}Z`;
  return { d, points: projected, fill: true, ...meta };
}

function render(shapes: Shape[], attrs: { package: string; pins: number; contacts?: number }): string {
  const points = shapes.flatMap((shape) => shape.points);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const pad = 5;
  const view = 80;
  const inner = view - pad * 2;
  const width = Math.max(maxX - minX, 0.001);
  const height = Math.max(maxY - minY, 0.001);
  const scale = Math.min(inner / width, inner / height);
  const ox = pad + (inner - width * scale) / 2 - minX * scale;
  const oy = pad + (inner - height * scale) / 2 - minY * scale;
  const paths = shapes
    .map((shape) => {
      const pin = shape.pin ? ` data-pin="${shape.pin}"` : "";
      const contact = shape.contact ? ` data-contact="${shape.contact}"` : "";
      const paint = shape.fill
        ? ` fill="var(--color-sunken)" stroke="none"`
        : shape.accent
          ? ` stroke="var(--color-signal)"`
          : "";
      const effect = shape.fill ? "" : ` vector-effect="non-scaling-stroke"`;
      return `<path${pin}${contact}${paint}${effect} d="${shape.d}"/>`;
    })
    .join("");
  const contacts = attrs.contacts ? ` data-contacts="${attrs.contacts}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true" focusable="false" data-package="${attrs.package}" data-pins="${attrs.pins}"${contacts}><g transform="matrix(${num(scale)} 0 0 ${num(scale)} ${num(ox)} ${num(oy)})">${paths}</g></svg>`;
}

/** Front outline, right-hand thickness, and the right half of the rounded crown. */
function roundedBody(width: number, depth: number, shoulder: number, steps = 14): { stroke: Mesh; front: Pt[] } {
  const radius = width / 2;
  const stroke = new Mesh();
  const front = tombstone(depth, width, shoulder, steps);
  stroke.chain(front);
  stroke.edge([0, depth, shoulder], [width, depth, shoulder]);
  stroke.edge([width, depth, 0], [width, 0, 0]);
  stroke.edge([width, 0, 0], [width, 0, shoulder]);
  stroke.edge([width, depth, shoulder], [width, 0, shoulder]);

  const rim: Pt[] = [];
  for (let index = 0; index <= 8; index += 1) {
    const angle = (index / 8) * (Math.PI / 2);
    rim.push([radius + radius * Math.cos(angle), 0, shoulder + radius * Math.sin(angle)]);
  }
  stroke.chain(rim, false);
  stroke.edge(
    [radius, depth, shoulder + radius],
    [radius, 0, shoulder + radius],
  );
  return { stroke, front };
}

function to220(): string {
  const width = 10.16;
  const depth = 4.6;
  const shoulder = 8.1;
  const radius = width / 2;
  const { stroke, front } = roundedBody(width, depth, shoulder);
  const side = face([
    [width, 0, 0],
    [width, depth, 0],
    [width, depth, shoulder],
    [width, 0, shoulder],
  ]);

  const hole = new Mesh();
  circle(hole, [radius, depth, shoulder + radius * 0.46], "front", radius * 0.28, 24);

  const pitch = 2.54;
  const leadW = 0.78;
  const leadT = 0.42;
  const leadL = 8.2;
  const first = width / 2 - pitch;
  const shapes: Shape[] = [
    face(front),
    side,
    stroke.toShape(),
    hole.toShape({ accent: true }),
  ];
  for (let pin = 1; pin <= 3; pin += 1) {
    const x = first + (pin - 1) * pitch - leadW / 2;
    shapes.push(lead(x, depth - leadT, 0.2, leadL + 0.2, leadW, leadT).toShape({ pin }));
  }
  return render(shapes, { package: "to-220", pins: 3 });
}

function to92(): string {
  const width = 4.8;
  const depth = 3.5;
  const shoulder = 3.3;
  const { stroke, front } = roundedBody(width, depth, shoulder, 12);
  const side = face([
    [width, 0, 0],
    [width, depth, 0],
    [width, depth, shoulder],
    [width, 0, shoulder],
  ]);

  const pitch = 1.27;
  const leadW = 0.38;
  const leadT = 0.38;
  const leadL = 7.4;
  const first = width / 2 - pitch;
  const shapes: Shape[] = [face(front), side, stroke.toShape()];
  for (let pin = 1; pin <= 3; pin += 1) {
    const x = first + (pin - 1) * pitch - leadW / 2;
    shapes.push(
      lead(x, depth - leadT, 0.15, leadL + 0.15, leadW, leadT).toShape({
        pin,
        accent: pin === 1,
      }),
    );
  }
  return render(shapes, { package: "to-92", pins: 3 });
}

function gull(x: number, width: number, profile: readonly (readonly [number, number])[]): Mesh {
  const mesh = new Mesh();
  const left = profile.map(([y, z]) => [x, y, z] as Pt);
  const right = [...profile].reverse().map(([y, z]) => [x + width, y, z] as Pt);
  mesh.chain([...left, ...right]);
  return mesh;
}

function sot223(): string {
  const length = 6.5;
  const depth = 3.5;
  const height = 1.6;
  const body = new Mesh();
  box(body, 0, 0, 0, length, depth, height);

  const pitch = 2.3;
  const leadW = 0.62;
  const centers = [length / 2 - pitch, length / 2, length / 2 + pitch];
  const wing: (readonly [number, number])[] = [
    [depth, 0.7],
    [depth + 0.45, 0.7],
    [depth + 0.85, 0],
    [depth + 2.15, 0],
  ];
  const shapes: Shape[] = [body.toShape()];
  centers.forEach((center, index) => {
    shapes.push(gull(center - leadW / 2, leadW, wing).toShape({ pin: index + 1 }));
  });

  const tabW = 3.15;
  const tabX = (length - tabW) / 2;
  const tab = solid(tabX, -4.4, 0, tabW, 4.4, 0.55);
  const tabStroke = tab[tab.length - 1];
  tabStroke.pin = 4;
  tabStroke.accent = true;
  return render(
    [...tab, face([
      [0, depth, 0],
      [length, depth, 0],
      [length, depth, height],
      [0, depth, height],
    ]), face([
      [0, 0, height],
      [length, 0, height],
      [length, depth, height],
      [0, depth, height],
    ]), face([
      [length, 0, 0],
      [length, depth, 0],
      [length, depth, height],
      [length, 0, height],
    ]), body.toShape(), ...shapes.slice(1)],
    { package: "sot-223", pins: 4 },
  );
}

function dip8(): string {
  const length = 9.2;
  const depth = 6.4;
  const height = 3.2;
  const body = new Mesh();
  box(body, 0, 0, 0, length, depth, height);
  const notch = new Mesh();
  const notchR = 0.72;
  const notchY = depth / 2;
  const notchPts: Pt[] = [];
  for (let index = 0; index <= 10; index += 1) {
    const angle = -Math.PI / 2 + (index / 10) * Math.PI;
    notchPts.push([notchR * Math.cos(angle), notchY + notchR * Math.sin(angle), height]);
  }
  notch.chain(notchPts, false);

  const pitch = 2.54;
  const row = 7.62;
  const overhang = (row - depth) / 2;
  const pinW = 0.5;
  const exit = 1.2;
  const pinL = 3.2;
  const first = (length - pitch * 3) / 2;
  const backPins: Shape[] = [];
  const frontPins: Shape[] = [];
  for (let index = 0; index < 4; index += 1) {
    const x = first + index * pitch - pinW / 2;
    frontPins.push(
      gull(x, pinW, [
        [depth, exit],
        [depth + overhang, exit],
        [depth + overhang, -pinL],
      ]).toShape({ pin: index + 1, accent: index === 0 }),
    );
    backPins.push(
      lead(x, -overhang, height, height + pinL, pinW, pinW).toShape({ pin: 8 - index }),
    );
  }
  return render(
    [
      ...backPins,
      face([
        [0, 0, height],
        [length, 0, height],
        [length, depth, height],
        [0, depth, height],
      ]),
      face([
        [0, depth, 0],
        [length, depth, 0],
        [length, depth, height],
        [0, depth, height],
      ]),
      face([
        [length, 0, 0],
        [length, depth, 0],
        [length, depth, height],
        [length, 0, height],
      ]),
      body.toShape(),
      notch.toShape(),
      ...frontPins,
    ],
    { package: "dip-8", pins: 8 },
  );
}

function headerPins(
  originX: number,
  originY: number,
  base: number,
  count: number,
  height: number,
  along: "x" | "y",
): Shape[] {
  const pitch = 2.54;
  const size = 0.5;
  const shapes: Shape[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = index * pitch;
    const x = along === "x" ? originX + offset : originX;
    const y = along === "y" ? originY + offset : originY;
    shapes.push(lead(x, y, base + height, height, size, size).toShape({ pin: index + 1 }));
  }
  return shapes;
}

function moduleBoard(): string {
  const length = 32;
  const depth = 22;
  const thick = 1.6;
  const holes = new Mesh();
  const inset = 2.6;
  const holeR = 1.05;
  for (const [x, y] of [
    [inset, inset],
    [length - inset, inset],
    [inset, depth - inset],
    [length - inset, depth - inset],
  ] as const) {
    circle(holes, [x, y, thick], "top", holeR, 14);
  }

  const shroudW = 2.54 * 3 + 2.2;
  const shroudX = (length - shroudW) / 2;
  const pinOrigin = length / 2 - 2.54 * 1.5 - 0.25;
  const trace = new Mesh();
  trace.chain(
    [
      [pinOrigin + 0.25, depth - 4.2, thick],
      [pinOrigin + 0.25, 13, thick],
      [12, 13, thick],
    ],
    false,
  );

  return render(
    [
      ...solid(0, 0, 0, length, depth, thick),
      holes.toShape(),
      trace.toShape({ accent: true }),
      ...solid(12, 7, thick, 8, 6, 1.35),
      ...solid(shroudX, depth - 4.2, thick, shroudW, 4.2, 2.3),
      ...headerPins(pinOrigin, depth - 2.4, thick + 2.3, 4, 3.4, "x"),
    ],
    { package: "module", pins: 4 },
  );
}

function relayModule(): string {
  const length = 38;
  const depth = 30;
  const thick = 1.6;
  const cell = 6;
  const blockX = 2.2;
  const blockY = depth - 7.2;
  const blockH = 6.2;
  const dividers = new Mesh();
  dividers.edge([blockX + cell, blockY, thick], [blockX + cell, blockY, thick + blockH]);
  dividers.edge([blockX + cell, blockY + 7.2, thick], [blockX + cell, blockY + 7.2, thick + blockH]);
  dividers.edge([blockX + cell, blockY, thick + blockH], [blockX + cell, blockY + 7.2, thick + blockH]);
  dividers.edge([blockX + cell * 2, blockY, thick], [blockX + cell * 2, blockY, thick + blockH]);
  dividers.edge([blockX + cell * 2, blockY + 7.2, thick], [blockX + cell * 2, blockY + 7.2, thick + blockH]);
  dividers.edge([blockX + cell * 2, blockY, thick + blockH], [blockX + cell * 2, blockY + 7.2, thick + blockH]);

  const screws: Shape[] = [];
  for (let index = 0; index < 3; index += 1) {
    const screw = new Mesh();
    circle(
      screw,
      [blockX + cell * index + cell / 2, blockY + 3.6, thick + blockH],
      "top",
      1.15,
      16,
    );
    screws.push(screw.toShape({ contact: index + 1 }));
  }

  const shroudX = 27.2;
  const shroudY = 3.2;
  const pins = headerPins(shroudX + 1.4, shroudY + 1.05, thick + 2.4, 3, 3.3, "x");

  const trace = new Mesh();
  trace.chain(
    [
      [shroudX + 1.65, shroudY + 2.6, thick],
      [shroudX + 1.65, 14, thick],
      [27, 14, thick],
    ],
    false,
  );

  return render(
    [
      ...solid(0, 0, 0, length, depth, thick),
      trace.toShape({ accent: true }),
      ...solid(11, 7, thick, 16, 13, 13.5),
      ...solid(blockX, blockY, thick, cell * 3, 7.2, blockH),
      dividers.toShape(),
      ...screws,
      ...solid(shroudX, shroudY, thick, 8.4, 2.6, 2.4),
      ...pins,
    ],
    { package: "relay", pins: 3, contacts: 3 },
  );
}

const DRAWINGS: Record<PackageKind, () => string> = {
  "to-220": to220,
  "to-92": to92,
  "sot-223": sot223,
  "dip-8": dip8,
  module: moduleBoard,
  relay: relayModule,
};

const cache = new Map<PackageKind, string>();

export function packageSvg(kind: PackageKind): string {
  const cached = cache.get(kind);
  if (cached) return cached;
  const svg = DRAWINGS[kind]();
  cache.set(kind, svg);
  return svg;
}

/** Known package, or null when the name is not one of the six drawings. */
export function resolveKind(packageType?: string | null, partNumber?: string | null): PackageKind | null {
  const pkg = packageType?.trim().toLowerCase() ?? "";
  const part = partNumber?.trim().toLowerCase() ?? "";
  if (pkg === "to-220") return "to-220";
  if (pkg === "to-92") return "to-92";
  if (pkg === "sot-223") return "sot-223";
  if (pkg === "dip-8") return "dip-8";
  if (pkg === "relay module" || part.startsWith("srd-")) return "relay";
  if (pkg === "module" || pkg === "pcb module" || pkg === "dip-30 module") return "module";
  return null;
}

type MarkParent = {
  appendChild: (node: HTMLElement) => unknown;
};

/** Browser-only. The SVG is a fixed drawing; the label is set with textContent. */
export function appendPackageMark(parent: MarkParent, packageType?: string | null, partNumber?: string | null) {
  const kind = resolveKind(packageType, partNumber);
  if (!kind) {
    const fallback = document.createElement("span");
    fallback.className = "line-fallback";
    fallback.textContent = packageType?.trim() ?? "";
    parent.appendChild(fallback);
    return;
  }
  const mark = document.createElement("span");
  mark.className = "pkg-fallback";
  mark.innerHTML = packageSvg(kind);
  const name = packageType?.trim();
  if (name) {
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = name;
    mark.appendChild(label);
  }
  parent.appendChild(mark);
}
