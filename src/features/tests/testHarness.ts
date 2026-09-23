import type { TestDefinition, TestResult, TestContext } from './types';

export class TestHarness {
  private tests: TestDefinition[] = [];

  register(test: TestDefinition) {
    this.tests.push(test);
  }

  getTests() {
    return this.tests;
  }

  async runAll(ctx: TestContext, onProgress: (result: TestResult) => void) {
    for (const test of this.tests) {
      onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'RUNNING' });
      const start = performance.now();
      try {
        const res = await test.fn(ctx);
        const duration = Math.round(performance.now() - start);
        onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: res.status, duration, message: res.message, details: res.details, error: res.error });
      } catch (e: any) {
        const duration = Math.round(performance.now() - start);
        onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'FAIL', duration, error: e.message || String(e) });
      }
    }
  }

  async runCategory(category: string, ctx: TestContext, onProgress: (result: TestResult) => void) {
    const categoryTests = this.tests.filter(t => t.category === category);
    for (const test of categoryTests) {
      onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'RUNNING' });
      const start = performance.now();
      try {
        const res = await test.fn(ctx);
        const duration = Math.round(performance.now() - start);
        onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: res.status, duration, message: res.message, details: res.details, error: res.error });
      } catch (e: any) {
        const duration = Math.round(performance.now() - start);
        onProgress({ id: test.id, name: test.name, category: test.category, layer: test.layer, status: 'FAIL', duration, error: e.message || String(e) });
      }
    }
  }
}

export const globalHarness = new TestHarness();
