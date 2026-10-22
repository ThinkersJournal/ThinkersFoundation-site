export const SITE = {
  name: "Thinker's Foundation",
  title: "Thinker's Foundation",
  description:
    "Thinkers helping thinkers. Thinker's Foundation is being formed to support open-source building blocks and the people who make things with them.",
  url: 'https://thinkersfoundation.net',
};

// PRE-FILING-PLAN.md section 3: the page may say only true things. Status is a single
// string so a change of legal status is one edit, in one place, that tests then pin.
// Keep it to what is true today. Never claim a tax status here; tests/claims.spec.ts
// fails the build on the words that would.
export const STATUS =
  'Incorporation in progress. Thinker’s Foundation does not yet exist as a legal entity.';

// Role mailbox from PRE-FILING-PLAN.md section 0, item 2. All role addresses forward;
// only admin@ (plus security@ and abuse@ on /contact) is published.
export const CONTACT_EMAIL = 'admin@thinkersfoundation.net';

// PRE-FILING-PLAN.md section 0, item 3: CireSnave chose his home address as the public mailing address
// (2026-10-10, restated 2026-10-22: "my home address is the address we will be using").
export const MAILING_ADDRESS: string[] | null = [
  'Eric Evans',
  '7600 E Las Palmas Drive',
  'Prescott Valley, Arizona 86314',
];

// Board and officers: published only once each has agreed to be named (section 3).
export const BOARD: { name: string; role: string }[] = [];

export const NAV: { label: string; href: string }[] = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
];

// Projects the foundation intends to support. Only links that exist today.
export const PROJECTS: { name: string; href: string; desc: string }[] = [
  {
    name: "Thinker's Journal",
    href: 'https://www.thinkersjournal.com',
    desc: 'Mentorship, pairing and open standards for people building things on their own.',
  },
  {
    name: 'Open-source building blocks',
    href: 'https://github.com/ThinkersJournal',
    desc: 'Small, documented libraries and tools, published under permissive licences.',
  },
];
