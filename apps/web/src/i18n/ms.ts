import type { Dictionary } from './types';

// Bahasa Melayu strings. Draft: to be reviewed by a native speaker (PRD I18N-9).
const ms: Dictionary = {
  site: {
    name: 'Jaminly',
    skipToContent: 'Langkau ke kandungan',
  },
  nav: {
    label: 'Utama',
    features: 'Ciri',
    privacy: 'Privasi',
    faq: 'Soalan lazim',
    github: 'GitHub',
    menu: 'Menu',
    language: 'Bahasa',
  },
  cta: {
    getApp: 'Dapatkan aplikasi',
    viewGithub: 'Lihat di GitHub',
  },
  home: {
    title: 'Jaminly: penjejak waranti dan simpanan resit',
    description:
      'Simpan semua resit di satu tempat dan dapatkan peringatan sebelum waranti tamat. Percuma dan sumber terbuka, di iPhone, Android dan web.',
    headline: 'Simpan setiap resit. Tuntut setiap waranti.',
    lead: 'Ambil gambar resit, dan Jaminly akan mengingatkan anda sebelum waranti tamat. Percuma dan sumber terbuka.',
    heroAlt:
      'Skrin utama Jaminly yang menyenaraikan waranti: TV Samsung yang tamat dalam 12 hari, serta pembersih vakum Dyson dan MacBook yang masih aktif.',
    heroBackAlt: 'Waranti Samsung Galaxy S25 dalam Jaminly dengan resitnya dilampirkan dan perkara yang dilindungi.',
  },
  problem: {
    lineA: 'Resit pudar.',
    lineB: 'Waranti tamat tanpa disedari.',
    lineC: 'Dan kebanyakan orang tidak pernah menyemak apa yang sebenarnya dilindungi.',
    photoAlt: 'Resit kedai yang pudar di atas meja, di sebelah kotak perkakas elektrik.',
  },
  features: {
    eyebrow: 'Apa yang ia lakukan',
    title: 'Semua tentang waranti, di satu tempat.',
    vault: {
      title: 'Setiap resit, disimpan selamat',
      body: 'Ambil gambar atau muat naik resit. Ia disimpan bersama waranti, sedia untuk ditunjukkan di kaunter servis.',
      alt: 'Resit dibuka dalam skrin penuh di Jaminly.',
    },
    reminders: {
      title: 'Peringatan tepat pada masa',
      body: 'Pemberitahuan push atau e-mel 30 hari sebelum, 7 hari sebelum, dan pada hari waranti tamat.',
      alt: 'Kad waranti dalam Jaminly: satu tamat dalam 12 hari, satu lagi masih aktif.',
    },
    coverage: {
      title: 'Tahu apa yang dilindungi',
      body: 'Alat ganti, upah, kerosakan tidak sengaja. Semak perlindungan waranti sebelum anda membayar untuk pembaikan.',
      alt: 'Senarai perlindungan dalam Jaminly: alat ganti dan upah dilindungi, kerosakan tidak sengaja dan kerosakan air tidak dilindungi.',
    },
    sync: {
      title: 'Di telefon dan web',
      body: 'Satu akaun dengan waranti yang sama di iPhone, Android dan pelayar web anda.',
      alt: 'Aplikasi web Jaminly dalam pelayar komputer.',
    },
    openSource: {
      title: 'Percuma, tanpa syarat',
      body: 'Tiada iklan, tiada langganan, tiada versi berbayar. Kodnya terbuka untuk disemak sesiapa sahaja.',
    },
  },
  how: {
    title: 'Tambah waranti dalam tiga langkah',
    snap: {
      title: 'Ambil gambar resit',
      body: 'Ambil foto atau pilih PDF. Bukti pembelian diwajibkan, jadi ia sentiasa ada semasa anda membuat tuntutan.',
      alt: 'Menambah Samsung Galaxy S25 dalam Jaminly dengan foto resitnya dilampirkan.',
    },
    set: {
      title: 'Tetapkan waranti',
      body: 'Pilih tempoh waranti dan perkara yang dilindungi. Templat akan mengisi perlindungan biasa untuk anda.',
      alt: 'Bahagian tempoh waranti, tarikh tamat dan perlindungan dalam borang Jaminly.',
    },
    remind: {
      title: 'Terima peringatan',
      body: 'Jaminly mengira hari dan mengingatkan anda sebelum waranti tamat, semasa anda masih boleh membuat tuntutan.',
      alt: 'Waranti TV Samsung dalam Jaminly yang tamat dalam 12 hari, dengan 97% tempohnya telah digunakan.',
    },
  },
  privacy: {
    title: 'Resit anda kekal milik anda.',
    noAds: 'Tiada iklan. Selama-lamanya.',
    noSelling: 'Kami tidak sekali-kali menjual data anda.',
    encrypted: 'Resit adalah peribadi dan disulitkan.',
    deleteAnytime: 'Padam semuanya, bila-bila masa.',
    readPolicy: 'Baca dasar privasi',
  },
  openSource: {
    eyebrow: 'Sumber terbuka',
    title: 'Percuma, sumber terbuka dan boleh dihos sendiri.',
    body: 'Jaminly berlesen MIT. Baca kodnya, cadangkan perubahan, atau jalankan salinan anda sendiri.',
    commandsLabel: 'Jalankan Jaminly di komputer anda',
    copy: 'Salin',
    copied: 'Disalin',
  },
  faq: {
    title: 'Soalan lazim',
    items: {
      free: {
        q: 'Adakah Jaminly benar-benar percuma?',
        a: 'Ya. Tiada iklan, tiada langganan dan tiada ciri berbayar. Jaminly ialah sumber terbuka di bawah lesen MIT.',
      },
      platforms: {
        q: 'Peranti apa yang disokong?',
        a: 'iPhone, Android dan mana-mana pelayar web moden, dengan akaun dan waranti yang sama di setiap satu. Di web, peringatan dihantar melalui e-mel.',
      },
      receipts: {
        q: 'Di mana resit saya disimpan?',
        a: 'Dalam storan peribadi yang disulitkan dan hanya boleh dicapai oleh akaun anda. Setiap kali anda membuka resit, aplikasi menggunakan pautan yang tamat tempoh selepas beberapa minit.',
      },
      lostPhone: {
        q: 'Apa berlaku jika telefon saya hilang?',
        a: 'Tiada apa yang hilang. Waranti dan resit anda disimpan dalam akaun anda, jadi log masuk dengan Google di telefon baharu atau di web dan semuanya ada di situ.',
      },
      selfHost: {
        q: 'Bolehkah saya mengehos Jaminly sendiri?',
        a: 'Boleh. Kodnya ada di GitHub. Anda boleh menjalankan pelayan sendiri dan menghalakan aplikasi kepadanya.',
      },
      deleteData: {
        q: 'Bagaimana saya memadam data saya?',
        a: 'Dalam aplikasi, pergi ke Tetapan (Settings) dan pilih Padam akaun (Delete account). Akaun, waranti dan resit anda dipadam serta-merta.',
      },
    },
    more: {
      privacy: 'Dasar privasi',
      deleteAccount: 'Cara pemadaman akaun berfungsi',
      github: 'Jaminly di GitHub',
    },
  },
  closing: {
    title: 'Resit anda yang seterusnya ialah yang pertama.',
    comingSoon:
      'Jaminly akan tiba di App Store, Google Play dan web. Ikuti projek ini di GitHub untuk mengetahui bila ia dilancarkan.',
    photoAlt: 'Telefon di tangan di rumah, di sebelah perkakas elektrik yang baru dibeli.',
  },
  photoSlot: {
    label: 'Foto',
  },
  footer: {
    product: 'Produk',
    legal: 'Undang-undang',
    project: 'Projek',
    privacyPolicy: 'Dasar privasi',
    terms: 'Terma penggunaan',
    deleteAccount: 'Padam akaun anda',
    license: 'Lesen MIT',
    contact: 'Hubungi',
    tagline: 'Simpanan waranti percuma dan sumber terbuka.',
    rights: 'Jaminly. Sumber terbuka di bawah lesen MIT.',
  },
  legal: {
    inShort: 'Ringkasnya',
    lastUpdated: 'Kemas kini terakhir',
    onThisPage: 'Dalam halaman ini',
    backToTop: 'Kembali ke atas',
    translationNotice: 'Ini ialah terjemahan. Jika terdapat perbezaan dengan versi bahasa Inggeris, versi bahasa Inggeris terpakai.',
    readEnglish: 'Baca versi bahasa Inggeris',
  },
  notFound: {
    title: 'Halaman tidak dijumpai',
    body: 'Halaman ini tidak wujud atau telah dipindahkan.',
    home: 'Pergi ke halaman utama',
  },
};

export default ms;
