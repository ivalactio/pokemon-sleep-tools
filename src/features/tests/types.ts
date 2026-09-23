export type TestStatus = 'PASS' | 'WARN' | 'FAIL' | 'SKIP' | 'RUNNING' | 'PENDING';

export interface TestResult {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  duration?: number;
  message?: string;
  details?: string;
  error?: string;
}

export interface TestContext {
  t: (key: string) => string;
  i18n: any;
  dispatch: any;
}

export type TestCase = (ctx: TestContext) => Promise<{ status: TestStatus; message?: string; details?: string; error?: string }>;

export interface TestDefinition {
  id: string;
  name: string;
  category: string;
  fn: TestCase;
}
