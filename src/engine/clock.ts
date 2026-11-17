export class SimulationClock {
  public time = 0;
  public timeScale = 1;

  step(dt: number): number {
    this.time += dt * this.timeScale;
    return this.time;
  }

  // Realistic lub-dub clinical heartbeat wave (0..1)
  pulse(holdAmount: number, boost: number): number {
    const phase = (this.time * 1.15) % 1;
    const lub = Math.exp(-Math.pow((phase - 0.12) * 18, 2));
    const dub = Math.exp(-Math.pow((phase - 0.28) * 18, 2)) * 0.72;
    return (lub + dub) * (0.28 + holdAmount * 0.85 + boost);
  }
}
