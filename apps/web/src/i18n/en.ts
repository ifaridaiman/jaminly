// English strings. `ms.ts` must provide every key (checked by the `Dictionary` type).
// Copy rules: DESIGN §8. No em-dashes or en-dashes in visible copy.
const en = {
  site: {
    name: 'Jaminly',
    skipToContent: 'Skip to content',
  },
  nav: {
    label: 'Main',
    features: 'Features',
    privacy: 'Privacy',
    faq: 'FAQ',
    github: 'GitHub',
    menu: 'Menu',
    language: 'Language',
  },
  cta: {
    getApp: 'Get the app',
    viewGithub: 'View on GitHub',
  },
  home: {
    title: 'Jaminly: warranty tracker and receipt vault',
    description:
      'Keep every receipt in one place and get reminded before your warranties expire. Free and open source, on iPhone, Android and the web.',
    headline: 'Keep every receipt. Claim every warranty.',
    lead: 'Snap your receipt, and Jaminly reminds you before the warranty runs out. Free and open source.',
    heroAlt:
      'Jaminly home screen listing warranties: a Samsung TV expiring in 12 days, and a Dyson vacuum and MacBook that are still active.',
    heroBackAlt: 'A Samsung Galaxy S25 warranty in Jaminly with its receipt attached and what it covers.',
  },
  problem: {
    lineA: 'Receipts fade.',
    lineB: 'Warranties expire quietly.',
    lineC: "And most people never check what's actually covered.",
    photoAlt: 'A faded shop receipt on a table next to a boxed appliance.',
  },
  features: {
    eyebrow: 'What it does',
    title: 'Everything about a warranty, in one place.',
    vault: {
      title: 'Every receipt, kept safe',
      body: 'Snap or upload the receipt. It stays with the warranty, ready to show at the service counter.',
      alt: 'A receipt open full screen in Jaminly.',
    },
    reminders: {
      title: 'Reminded in time',
      body: 'A push notification or email 30 days before, 7 days before, and on the day a warranty ends.',
      alt: 'Warranty cards in Jaminly: one expiring in 12 days, one still active.',
    },
    coverage: {
      title: "Know what's covered",
      body: 'Parts, labour, accidental damage. Check what your warranty includes before you pay for a repair.',
      alt: 'A coverage list in Jaminly: parts and labour covered, accidental and water damage not covered.',
    },
    sync: {
      title: 'On your phone and the web',
      body: 'One account with the same warranties on iPhone, Android and in your browser.',
      alt: 'The Jaminly web app in a desktop browser.',
    },
    openSource: {
      title: 'Free, with no catch',
      body: 'No ads, no subscription, no paid tier. The code is public for anyone to check.',
    },
  },
  how: {
    title: 'Add a warranty in three steps',
    snap: {
      title: 'Snap the receipt',
      body: 'Take a photo or choose a PDF. Proof of purchase is required, so you always have it when you claim.',
      alt: 'Adding a Samsung Galaxy S25 in Jaminly with a photo of its receipt attached.',
    },
    set: {
      title: 'Set the warranty',
      body: 'Pick the warranty length and what it covers. Templates fill in the usual cover for you.',
      alt: 'The warranty length, expiry date and coverage section of the Jaminly form.',
    },
    remind: {
      title: 'Get reminded',
      body: 'Jaminly counts down and reminds you before the warranty ends, while you can still claim.',
      alt: 'A Samsung TV warranty in Jaminly that expires in 12 days, with 97% of its time used.',
    },
  },
  privacy: {
    title: 'Your receipts stay yours.',
    noAds: 'No ads. Ever.',
    noSelling: 'We never sell your data.',
    encrypted: 'Receipts are private and encrypted.',
    deleteAnytime: 'Delete everything, anytime.',
    readPolicy: 'Read the privacy policy',
  },
  openSource: {
    eyebrow: 'Open source',
    title: 'Free, open source, and yours to host.',
    body: 'Jaminly is MIT licensed. Read the code, suggest a change, or run your own copy.',
    commandsLabel: 'Run Jaminly on your computer',
    copy: 'Copy',
    copied: 'Copied',
  },
  faq: {
    title: 'Questions',
    items: {
      free: {
        q: 'Is Jaminly really free?',
        a: 'Yes. There are no ads, no subscription and no paid features. Jaminly is open source under the MIT license.',
      },
      platforms: {
        q: 'Which devices does it work on?',
        a: 'iPhone, Android and any modern web browser, with the same account and warranties on each. On the web, reminders come by email.',
      },
      receipts: {
        q: 'Where are my receipts stored?',
        a: 'In private, encrypted storage that only your account can reach. Each time you open a receipt, the app uses a link that expires after a few minutes.',
      },
      lostPhone: {
        q: 'What happens if I lose my phone?',
        a: 'Nothing is lost. Your warranties and receipts are saved to your account, so sign in with Google on a new phone or on the web and they are all there.',
      },
      selfHost: {
        q: 'Can I host Jaminly myself?',
        a: 'Yes. The code is on GitHub. You can run your own server and point the app at it.',
      },
      deleteData: {
        q: 'How do I delete my data?',
        a: 'In the app, go to Settings and choose Delete account. Your account, warranties and receipts are deleted straight away.',
      },
    },
    more: {
      privacy: 'Privacy policy',
      deleteAccount: 'How account deletion works',
      github: 'Jaminly on GitHub',
    },
  },
  closing: {
    title: 'Your next receipt is the first one.',
    comingSoon:
      'Jaminly is on its way to the App Store, Google Play and the web. Follow the project on GitHub to hear when it launches.',
    photoAlt: 'A phone in hand at home, next to a newly bought appliance.',
  },
  photoSlot: {
    label: 'Photo',
  },
  footer: {
    product: 'Product',
    legal: 'Legal',
    project: 'Project',
    privacyPolicy: 'Privacy policy',
    terms: 'Terms of use',
    deleteAccount: 'Delete your account',
    license: 'MIT license',
    contact: 'Contact',
    tagline: 'A free, open-source warranty vault.',
    rights: 'Jaminly. Open source under the MIT license.',
  },
  legal: {
    inShort: 'In short',
    lastUpdated: 'Last updated',
    onThisPage: 'On this page',
    backToTop: 'Back to top',
    translationNotice: 'This is a translation. If it differs from the English version, the English version applies.',
    readEnglish: 'Read the English version',
  },
  notFound: {
    title: 'Page not found',
    body: "This page doesn't exist or has moved.",
    home: 'Go to the home page',
  },
};

export default en;
