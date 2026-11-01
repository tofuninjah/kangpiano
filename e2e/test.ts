// Every spec imports test and expect from here. With JavaScript on, each test
// fails if the page reports a CSP violation, an uncaught error or a console
// error, so the hashed-script CSP and the response headers are checked on
// every flow, not only on page load.
import { test as base, expect } from '@playwright/test';

/** Every page in the build. */
export const BUILT_PAGES = [
  '/',
  '/ko',
  '/request-sent',
  '/request-not-sent',
  '/ko/request-sent',
  '/ko/request-not-sent',
];

interface Violation {
  directive: string;
  blocked: string;
  /** Element the report was dispatched on (SELECT, #document, ...). */
  target: string;
}

/**
 * WebKit's built-in <select> sets an inline style inside its own shadow tree,
 * which any strict style-src reports. It comes from the engine, not this
 * site, and the select renders the same with or without it (compared in
 * WebKit with and without the CSP).
 */
function isWebKitSelectQuirk(violation: Violation, browserName: string) {
  return (
    browserName === 'webkit' &&
    violation.directive === 'style-src-attr' &&
    violation.target === 'SELECT'
  );
}

/**
 * Console errors that don't mean something is wrong. CSP refusals are
 * already checked, with the element they hit, by the violation listener.
 * Failed /api/contact loads come from the specs that make the endpoint fail
 * on purpose and assert the visitor-facing result.
 */
function isExpectedConsoleError(text: string, url: string) {
  if (/^Refused to /.test(text)) return true;
  return (
    text.startsWith('Failed to load resource') &&
    new URL(url, 'http://localhost').pathname === '/api/contact'
  );
}

export const test = base.extend<{ pageGuard: void }>({
  pageGuard: [
    async ({ page, javaScriptEnabled, browserName }, use) => {
      if (javaScriptEnabled === false) {
        await use();
        return;
      }

      const violations: Violation[] = [];
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const { url } = message.location();
        if (isExpectedConsoleError(message.text(), url)) return;
        consoleErrors.push(`${message.text()} [${url}]`);
      });
      // Bindings and init scripts come from the browser, not the page, so
      // the page's CSP doesn't apply to them.
      await page.exposeFunction(
        'reportCspViolation',
        (violation: Violation) => {
          if (!isWebKitSelectQuirk(violation, browserName)) {
            violations.push(violation);
          }
        }
      );
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (
            window as unknown as {
              reportCspViolation: (violation: Violation) => void;
            }
          ).reportCspViolation;
          report({
            directive: event.effectiveDirective,
            blocked: event.blockedURI,
            target: event.target instanceof Node ? event.target.nodeName : '',
          });
        });
      });

      await use();

      // Reports arrive asynchronously; one more round trip lets any sent
      // just before the test ended land before the check.
      if (!page.isClosed()) {
        await page
          .evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
          .catch(() => {});
      }
      expect(violations, 'CSP violations').toEqual([]);
      expect(errors, 'uncaught page errors').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
