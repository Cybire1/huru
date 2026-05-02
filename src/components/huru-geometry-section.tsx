"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/** Project 3D isometric coords → 2D SVG coords. scale = 20px/unit. */
function iso(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
): [number, number] {
  return [cx + (x - y) * 20, cy + (x + y) * 10 - z * 20];
}

/* ─── SVG helpers ─── */

function isoLine(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  cx: number,
  cy: number,
): string {
  const [sx1, sy1] = iso(x1, y1, z1, cx, cy);
  const [sx2, sy2] = iso(x2, y2, z2, cx, cy);
  return `M${sx1},${sy1} L${sx2},${sy2}`;
}

/** Isometric quad from 4 corner coords */
function isoQuad(
  corners: [number, number, number][],
  cx: number,
  cy: number,
): string {
  return (
    corners
      .map((c, i) => {
        const [sx, sy] = iso(c[0], c[1], c[2], cx, cy);
        return `${i === 0 ? "M" : "L"}${sx},${sy}`;
      })
      .join(" ") + " Z"
  );
}

/** Isometric ellipse approximation */
function isoEllipse(
  cx3d: number,
  cy3d: number,
  cz3d: number,
  rx: number,
  ry: number,
  svgCx: number,
  svgCy: number,
): string {
  const pts = 24;
  const path: string[] = [];
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const px = cx3d + Math.cos(a) * rx;
    const py = cy3d + Math.sin(a) * ry;
    const [sx, sy] = iso(px, py, cz3d, svgCx, svgCy);
    path.push(`${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`);
  }
  return path.join(" ");
}

function Dot({
  x,
  y,
  z,
  cx,
  cy,
  r = 2,
}: {
  x: number;
  y: number;
  z: number;
  cx: number;
  cy: number;
  r?: number;
}) {
  const [sx, sy] = iso(x, y, z, cx, cy);
  return (
    <circle
      data-geo-dot
      cx={sx}
      cy={sy}
      r={r}
      fill="currentColor"
      opacity={0.5}
    />
  );
}

/* ─── FIG 0.1 — Verified Inference (stacked slabs) ─── */

function VerifiedInferenceSVG() {
  const cx = 140;
  const cy = 190;
  const w = 4;
  const d = 4;
  const h = 0.3;

  function slab(z: number, opacity: number) {
    const top = isoQuad(
      [
        [0, 0, z + h],
        [w, 0, z + h],
        [w, d, z + h],
        [0, d, z + h],
      ],
      cx,
      cy,
    );
    const right = isoQuad(
      [
        [w, 0, z + h],
        [w, 0, z],
        [w, d, z],
        [w, d, z + h],
      ],
      cx,
      cy,
    );
    const front = isoQuad(
      [
        [0, d, z + h],
        [w, d, z + h],
        [w, d, z],
        [0, d, z],
      ],
      cx,
      cy,
    );
    return (
      <g opacity={opacity}>
        <path
          data-geo-draw
          d={top}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
        <path
          data-geo-draw
          d={right}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
        <path
          data-geo-draw
          d={front}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
      </g>
    );
  }

  const detailLines = [1, 2, 3].map((i) => {
    const frac = i / 4;
    const z = 0;
    return (
      <path
        key={i}
        data-geo-draw
        d={isoLine(frac * w, d, z, frac * w, d, z + h, cx, cy)}
        stroke="currentColor"
        strokeWidth={0.4}
        opacity={0.2}
      />
    );
  });

  const connectors = [
    [0, d],
    [w, d],
  ].map(([x, y], i) => (
    <path
      key={i}
      data-geo-fade
      d={isoLine(x, y, h, x, y, 2.4, cx, cy)}
      stroke="currentColor"
      strokeWidth={0.5}
      strokeDasharray="3 3"
      opacity={0.25}
    />
  ));

  const ellipse = isoEllipse(w / 2, d / 2, 2.4 + h, 1.4, 1.4, cx, cy);

  return (
    <svg
      viewBox="0 0 280 280"
      className="w-full h-auto text-og-text-3"
      fill="none"
    >
      {slab(0, 0.35)}
      {detailLines}
      {slab(1.2, 0.55)}
      {slab(2.4, 0.8)}
      {connectors}
      <path
        data-geo-draw
        d={ellipse}
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.7}
      />
      <Dot x={w / 2} y={d / 2} z={2.4 + h} cx={cx} cy={cy} r={2.5} />
      <Dot x={0} y={0} z={2.4 + h} cx={cx} cy={cy} />
    </svg>
  );
}

/* ─── FIG 0.2 — One API Key (connected cubes) ─── */

function OneApiKeySVG() {
  const cx = 140;
  const cy = 200;

  function cube(
    ox: number,
    oy: number,
    oz: number,
    s: number,
    opacity: number,
  ) {
    const top = isoQuad(
      [
        [ox, oy, oz + s],
        [ox + s, oy, oz + s],
        [ox + s, oy + s, oz + s],
        [ox, oy + s, oz + s],
      ],
      cx,
      cy,
    );
    const right = isoQuad(
      [
        [ox + s, oy, oz + s],
        [ox + s, oy, oz],
        [ox + s, oy + s, oz],
        [ox + s, oy + s, oz + s],
      ],
      cx,
      cy,
    );
    const front = isoQuad(
      [
        [ox, oy + s, oz + s],
        [ox + s, oy + s, oz + s],
        [ox + s, oy + s, oz],
        [ox, oy + s, oz],
      ],
      cx,
      cy,
    );
    return (
      <g opacity={opacity}>
        <path
          data-geo-draw
          d={top}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
        <path
          data-geo-draw
          d={right}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
        <path
          data-geo-draw
          d={front}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
        />
      </g>
    );
  }

  const cubes: [number, number, number, number][] = [
    [0.9, 0.9, 0, 2.2],
    [1.5, 1.5, 2.2, 1],
    [3.5, 0.4, 0, 1.2],
    [-0.3, 3.3, 0, 1.2],
  ];

  function cubeCenter(
    c: [number, number, number, number],
  ): [number, number, number] {
    return [c[0] + c[3] / 2, c[1] + c[3] / 2, c[2] + c[3] / 2];
  }

  const connections: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
  ];

  const topCube = cubes[1];
  const topCenter: [number, number, number] = [
    topCube[0] + topCube[3] / 2,
    topCube[1] + topCube[3] / 2,
    topCube[2] + topCube[3] + 0.5,
  ];
  const diamondSize = 0.3;
  const diamond = isoQuad(
    [
      [topCenter[0], topCenter[1] - diamondSize, topCenter[2]],
      [topCenter[0] + diamondSize, topCenter[1], topCenter[2]],
      [topCenter[0], topCenter[1] + diamondSize, topCenter[2]],
      [topCenter[0] - diamondSize, topCenter[1], topCenter[2]],
    ],
    cx,
    cy,
  );

  return (
    <svg
      viewBox="0 0 280 280"
      className="w-full h-auto text-og-text-3"
      fill="none"
    >
      {cube(cubes[3][0], cubes[3][1], cubes[3][2], cubes[3][3], 0.4)}
      {cube(cubes[2][0], cubes[2][1], cubes[2][2], cubes[2][3], 0.5)}
      {cube(cubes[0][0], cubes[0][1], cubes[0][2], cubes[0][3], 0.7)}
      {cube(cubes[1][0], cubes[1][1], cubes[1][2], cubes[1][3], 0.8)}

      {connections.map(([a, b], i) => {
        const ca = cubeCenter(cubes[a]);
        const cb = cubeCenter(cubes[b]);
        return (
          <path
            key={i}
            data-geo-fade
            d={isoLine(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cx, cy)}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeDasharray="4 3"
            opacity={0.3}
          />
        );
      })}

      <path
        data-geo-draw
        d={diamond}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.7}
      />
      <Dot
        x={topCenter[0]}
        y={topCenter[1]}
        z={topCenter[2]}
        cx={cx}
        cy={cy}
        r={1.5}
      />
    </svg>
  );
}

/* ─── FIG 0.3 — Built for Speed (cascading planes) ─── */

function BuiltForSpeedSVG() {
  const cx = 140;
  const cy = 170;

  const planes = Array.from({ length: 6 }, (_, i) => {
    const depth = i * 0.8;
    const scale = 1 - i * 0.12;
    const w = 3.5 * scale;
    const h = 3 * scale;
    const xOff = (3.5 - w) / 2;
    const opacity = 0.8 - i * 0.1;

    const rect = isoQuad(
      [
        [xOff, depth, h],
        [xOff + w, depth, h],
        [xOff + w, depth, 0],
        [xOff, depth, 0],
      ],
      cx,
      cy,
    );
    return { rect, opacity, depth, xOff, w, h };
  });

  const speedLines = [0.5, 1.2, 2.0, 2.8].map((z, i) => {
    const startY = -0.5;
    const endY = 4.5;
    const [sx1, sy1] = iso(-0.8, startY, z, cx, cy);
    const [sx2, sy2] = iso(-0.8, endY, z, cx, cy);
    return (
      <line
        key={i}
        data-geo-fade
        x1={sx1}
        y1={sy1}
        x2={sx2}
        y2={sy2}
        stroke="currentColor"
        strokeWidth={0.4}
        opacity={0.15 + i * 0.05}
        strokeDasharray="6 4"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 280 280"
      className="w-full h-auto text-og-text-3"
      fill="none"
    >
      {speedLines}
      {[...planes].reverse().map((p, i) => (
        <path
          key={i}
          data-geo-draw
          d={p.rect}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
          opacity={p.opacity}
        />
      ))}
      <Dot x={planes[0].xOff} y={0} z={planes[0].h} cx={cx} cy={cy} />
      <Dot
        x={planes[0].xOff + planes[0].w}
        y={0}
        z={planes[0].h}
        cx={cx}
        cy={cy}
      />
    </svg>
  );
}

/* ─── Content data ─── */

const columns = [
  {
    fig: "FIG 0.1",
    Illustration: VerifiedInferenceSVG,
    title: "Verified inference",
    description:
      "Every response is cryptographically attested by a Trusted Execution Environment — tamper-proof by default.",
  },
  {
    fig: "FIG 0.2",
    Illustration: OneApiKeySVG,
    title: "One API key",
    description:
      "A single key unlocks every model in the network. No wallets, no gas, no blockchain overhead.",
  },
  {
    fig: "FIG 0.3",
    Illustration: BuiltForSpeedSVG,
    title: "Built for speed",
    description:
      "Requests route to the nearest node automatically. Sub-200ms latency, globally distributed.",
  },
];

/* ─── Main section component ─── */

export function HuruGeometrySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      const scope = sectionRef.current;

      const cols = gsap.utils.toArray<HTMLElement>("[data-geo-col]", scope);
      if (!cols.length) return;

      // 1. Column containers fade up with stagger
      gsap.fromTo(
        cols,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: scope,
            start: "top 80%",
            once: true,
          },
        },
      );

      // 2. SVG line draw-in: strokeDashoffset from full length → 0
      const drawPaths = gsap.utils.toArray<SVGPathElement>(
        "[data-geo-draw]",
        scope,
      );
      for (const path of drawPaths) {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      }

      gsap.to(drawPaths, {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power2.inOut",
        stagger: 0.04,
        scrollTrigger: {
          trigger: scope,
          start: "top 80%",
          once: true,
        },
      });

      // 3. Dashed connector lines fade in after draw starts
      const fadePaths = gsap.utils.toArray<SVGElement>(
        "[data-geo-fade]",
        scope,
      );
      gsap.fromTo(
        fadePaths,
        { opacity: 0 },
        {
          opacity: (i, el) =>
            Number.parseFloat(el.getAttribute("opacity") || "0.3"),
          duration: 0.6,
          delay: 0.8,
          ease: "power2.out",
          stagger: 0.06,
          scrollTrigger: {
            trigger: scope,
            start: "top 80%",
            once: true,
          },
        },
      );

      // 4. Accent dots pop in at the end
      const dots = gsap.utils.toArray<SVGCircleElement>(
        "[data-geo-dot]",
        scope,
      );
      gsap.fromTo(
        dots,
        { scale: 0, transformOrigin: "center center" },
        {
          scale: 1,
          duration: 0.4,
          delay: 1.0,
          ease: "back.out(3)",
          stagger: 0.08,
          scrollTrigger: {
            trigger: scope,
            start: "top 80%",
            once: true,
          },
        },
      );

      // 5. Hover interactions per column
      for (const col of cols) {
        const svg = col.querySelector("svg");
        const colDraws = gsap.utils.toArray<SVGElement>(
          "[data-geo-draw]",
          col,
        );
        const colFades = gsap.utils.toArray<SVGElement>(
          "[data-geo-fade]",
          col,
        );
        const colDots = gsap.utils.toArray<SVGCircleElement>(
          "[data-geo-dot]",
          col,
        );

        const hoverTl = gsap.timeline({ paused: true });

        // SVG scales up
        if (svg) {
          hoverTl.to(
            svg,
            { scale: 1.08, duration: 0.5, ease: "power2.out" },
            0,
          );
        }

        // Strokes brighten
        if (colDraws.length) {
          hoverTl.to(
            colDraws,
            {
              strokeWidth: 1,
              duration: 0.4,
              ease: "power2.out",
              stagger: 0.015,
            },
            0,
          );
        }

        // Dashed lines brighten
        if (colFades.length) {
          hoverTl.to(
            colFades,
            { opacity: 0.55, duration: 0.4, ease: "power2.out" },
            0,
          );
        }

        // Dots pulse bigger
        if (colDots.length) {
          hoverTl.to(
            colDots,
            {
              scale: 1.6,
              opacity: 0.8,
              transformOrigin: "center center",
              duration: 0.4,
              ease: "power2.out",
            },
            0.05,
          );
        }

        col.addEventListener("mouseenter", () => hoverTl.play());
        col.addEventListener("mouseleave", () => hoverTl.reverse());
      }
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef}>
      <div className="mb-8 text-center sm:mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-og-text-3">
          How it works
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-og-black">
          Infrastructure you don&apos;t have to think about
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {columns.map((col, i) => (
          <div
            key={col.fig}
            data-geo-col
            className={`flex flex-col items-center px-6 py-8 sm:px-8 sm:py-10 ${
              i > 0
                ? "border-t border-og-border lg:border-t-0 lg:border-l"
                : ""
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-og-text-3">
              {col.fig}
            </span>

            <div className="my-6 w-full max-w-[320px]">
              <col.Illustration />
            </div>

            <h3 className="text-base font-semibold text-og-black">
              {col.title}
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-og-text-2">
              {col.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
