import { describe, expect, it } from "vitest";
import { readTranslateX, springFlick, springOffset, springOmega, springSmooth } from "../../src/components/cart-motion";

describe("cart sheet spring", () => {
  it("settles a resting smooth spring without crossing the target", () => {
    const { omega, zeta } = springOmega(springSmooth);
    expect(zeta).toBe(1);
    for (let step = 0; step <= 40; step += 1) {
      const sample = springOffset({
        from: 100,
        to: 0,
        velocity: 0,
        omega,
        zeta,
        time: (step / 40) * springSmooth.visualDuration,
      });
      expect(sample.value).toBeGreaterThanOrEqual(-0.01);
    }
    const end = springOffset({
      from: 100,
      to: 0,
      velocity: 0,
      omega,
      zeta,
      time: springSmooth.visualDuration,
    });
    expect(end.value).toBeLessThan(3);
  });

  it("carries release velocity and can pass the resting point", () => {
    const { omega, zeta } = springOmega(springFlick);
    let crossed = false;
    for (let step = 1; step <= 45; step += 1) {
      const sample = springOffset({
        from: 80,
        to: 0,
        velocity: -1400,
        omega,
        zeta,
        time: step / 60,
      });
      if (sample.value < -0.5) crossed = true;
    }
    expect(crossed).toBe(true);
  });

  it("reports a velocity that matches the change in position", () => {
    const { omega, zeta } = springOmega(springFlick);
    const time = 0.12;
    const dt = 0.0005;
    const sample = springOffset({ from: 40, to: 0, velocity: 900, omega, zeta, time });
    const next = springOffset({ from: 40, to: 0, velocity: 900, omega, zeta, time: time + dt });
    expect(Math.abs((next.value - sample.value) / dt - sample.velocity)).toBeLessThan(40);
  });

  it("reads an inline translateX", () => {
    expect(readTranslateX("translateX(12.5px)")).toBe(12.5);
    expect(readTranslateX("")).toBeNull();
  });
});
