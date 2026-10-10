import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// PRE-FILING-PLAN.md section 3. Until the IRS recognises the organization, the site must
// not say or imply a tax status, and must not ask for money. Saying it early is a
// misrepresentation and complicates the later application. This spec reads the BUILT
// output, so a phrase assembled in a component or a template is caught as well as one
// typed into a page.
//
// To turn a term on later, delete it from FORBIDDEN in the same PR that makes it true,
// and say why in the PR.
const FORBIDDEN: { re: RegExp; why: string }[] = [
  { re: /501\s*\(?\s*c\s*\)?\s*\(?\s*3\s*\)?/i, why: '501(c)(3) is a status the IRS has not granted' },
  { re: /tax[\s-]*exempt/i, why: 'implies a tax status' },
  { re: /tax[\s-]*deductib/i, why: 'implies a tax status' },
  { re: /\bdonat/i, why: 'no donation ask before recognition' },
  { re: /\bcharit/i, why: 'implies a charitable status' },
  { re: /non[\s-]?profit/i, why: 'a status claim; use "incorporation in progress"' },
  { re: /\b(?:EIN|employer identification)\b/i, why: 'not issued yet' },
  { re: /\bsponsor(?:ship|s)?\b/i, why: 'solicitation' },
  { re: /\b(?:give|giving|gift|gifts|pledge)\b/i, why: 'solicitation' },
];

const DIST = join(process.cwd(), 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Tags and attribute values are stripped so a class name cannot hide or fake a hit; the
// visible text, the title and the meta descriptions are what a reader (or a clerk) sees.
function visibleText(html: string): string {
  const metas = [...html.matchAll(/<meta[^>]+content="([^"]*)"/gi)].map((m) => m[1]);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return [body, ...metas].join('\n').replace(/&rsquo;|&#8217;|&#x2019;/g, "'");
}

const pages = walk(DIST).filter((p) => p.endsWith('.html'));

test('the build produced the pages this spec is supposed to read (positive control)', () => {
  const names = pages.map((p) => p.replace(DIST, '').replace(/\\/g, '/'));
  expect(names).toEqual(expect.arrayContaining(['/index.html', '/about/index.html', '/contact/index.html', '/privacy/index.html', '/404.html']));
});

test('the scanner can see a forbidden phrase (negative control for the control)', () => {
  expect(FORBIDDEN.some((f) => f.re.test(visibleText('<p>We are a 501(c)(3) organization</p>')))).toBe(true);
  expect(FORBIDDEN.some((f) => f.re.test(visibleText('<p class="donate">Incorporation in progress</p>')))).toBe(false);
});

for (const page of pages) {
  const rel = page.replace(DIST, '').replace(/\\/g, '/');
  test(`${rel} says no tax status and asks for no money`, () => {
    const text = visibleText(readFileSync(page, 'utf8'));
    const hits = FORBIDDEN.filter((f) => f.re.test(text)).map((f) => `${f.re}: ${f.why}`);
    expect(hits).toEqual([]);
  });
}

test('every page that names the status says "incorporation in progress"', () => {
  const home = visibleText(readFileSync(join(DIST, 'index.html'), 'utf8'));
  expect(home).toMatch(/Incorporation in progress/);
});

test('no analytics or third-party script reaches the built output', () => {
  const offenders: string[] = [];
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    for (const m of html.matchAll(/<script[^>]*>/gi)) offenders.push(`${p}: ${m[0]}`);
    for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/gi)) {
      const host = new URL(m[1]).hostname;
      // Outbound links are allowed only to the founder's own two properties.
      if (!['www.thinkersjournal.com', 'github.com', 'thinkersfoundation.net'].includes(host)) {
        offenders.push(`${p}: ${m[1]}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});
