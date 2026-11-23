import type {
  BlogArticle,
  BrandProfile,
  CampaignLanding,
  CollectionMeta,
  FaqItem,
  PolicyDocument,
  PolicySlug,
  ProductQuestion,
} from '../types/store';
import { STUDIO_IMAGES } from './catalog';

export const COLLECTION_CATALOG: CollectionMeta[] = [
  {
    slug: 'all',
    title: 'Master Catalog — All Matchday Gear',
    eyebrow: 'INDEX 00 · COMPLETE ARCHIVE',
    seoDescription:
      'Browse all 51 authentic Sport Castle products in Phnom Penh: pro football boots, 2026/27 UEFA Champions League jerseys, Cambodia Varaman kits, F1 teamwear, and FIFA match balls.',
    editorialIntro:
      'Every boot, authentic 2026/27 European jersey, Cambodia Varaman kit, and paddock garment stocked across our Sonthormuk, Sen Sok, and Chomkadong branches.',
    preset: { category: 'all' },
  },
  {
    slug: 'football-boots',
    title: 'Football Boots & Soccer Cleats',
    eyebrow: 'SOCCER FOOTWEAR · PITCH TRACTION',
    seoDescription:
      'Shop 15 authentic studded football boots (including Adidas F50 Messi Signature, Nike Mercurial Vapor 16 AG-Pro, and Puma King Ultimate) matched to grass (FG) and artificial turf (AG/TF/MG).',
    editorialIntro:
      'Fifteen elite studded soccer boots from Nike, Adidas (including the F50 Messi Signature Edition), Puma, Mizuno Japan, and New Balance — indexed by stud plate and gram weight for Cambodian pitches.',
    preset: { category: 'boots' },
  },
  {
    slug: 'jerseys-kits',
    title: '2026/27 Club & National Jerseys',
    eyebrow: 'INDEX 02 · AUTHENTIC KIT ROOM',
    seoDescription:
      'Official 2026/27 Top 5 League, UEFA Champions League, National Teams (Europe, South America, Asia/ASEAN), Retro Archive, and Limited Edition jerseys with EU sizing and same-day heat-press customization.',
    editorialIntro:
      'Authentic player-grade Home, Away, Third, Retro, and Limited Edition kits across Europe, South America, Asia/ASEAN national teams, and Top 5 club leagues — with full European sizing.',
    preset: { category: 'jerseys' },
  },
  {
    slug: 'ucl-2026-27',
    title: '2026/27 UEFA Champions League Drop',
    eyebrow: 'INDEX 03 · EUROPEAN NIGHTS',
    seoDescription:
      'Shop official 2026/27 UEFA Champions League home, away, and third kits for FC Barcelona, Real Madrid, Arsenal, Liverpool, Bayern Munich, AC Milan, Inter, and PSG.',
    editorialIntro:
      'Europe’s flagship clubs under floodlights. Complete 2026/27 Home, Away, and Collector Editions eligible for official UCL starball sleeve patches.',
    preset: { category: 'jerseys', uclOnly: true },
  },
  {
    slug: 'f1-motorsport',
    title: '2026 Formula 1 Paddock Collection',
    eyebrow: 'INDEX 04 · MOTORSPORT ATELIER',
    seoDescription:
      'Official 2026 Scuderia Ferrari, Oracle Red Bull Racing, Mercedes-AMG Petronas, and McLaren F1 team jerseys (2 colorways per team) and paddock jackets.',
    editorialIntro:
      'Official 2026 team jerseys (2 distinct colorways per constructor) and full-zip paddock jackets from Scuderia Ferrari, Oracle Red Bull Racing, Mercedes-AMG Petronas, and McLaren F1 Team.',
    preset: { category: 'f1' },
  },
  {
    slug: 'phnom-penh-turf',
    title: 'Phnom Penh 5v5 & 7v7 Turf Specialist',
    eyebrow: 'INDEX 05 · CITY PITCH EDIT',
    seoDescription:
      'Artificial turf (TF & AG) football boots engineered for Sen Sok, Toul Kork, and BKK artificial 3G/4G pitches in Phnom Penh.',
    editorialIntro:
      'Low-profile conical AG studs and multi-directional TF rubber outsoles chosen by Phnom Penh 7v7 league players to protect knees on firm artificial surfaces.',
    preset: { category: 'boots', surfaces: ['TF', 'AG'] },
  },
  {
    slug: 'match-balls',
    title: 'FIFA Quality Pro Match & Futsal Balls',
    eyebrow: 'INDEX 06 · FLIGHT & CONTROL',
    seoDescription:
      'Thermally bonded FIFA Quality Pro match balls and low-bounce Select futsal balls in Phnom Penh.',
    editorialIntro:
      'Seamless thermally bonded match spheres for 11v11 grass leagues alongside calibrated low-bounce futsal balls for indoor court tournaments.',
    preset: { category: 'balls' },
  },
  {
    slug: 'gk-essentials',
    title: 'Goalkeeper Gloves & Pitch Essentials',
    eyebrow: 'INDEX 07 · MATCHDAY HARDWARE',
    seoDescription:
      '4mm German latex goalkeeper gloves, TruSox 3.0 anti-slip grip socks, and carbon shin guards stocked in Phnom Penh.',
    editorialIntro:
      'High-humidity German contact latex palms, silicone-locked TruSox grip socks, and featherweight protection engineered for 90-minute focus.',
    preset: { category: 'essentials' },
  },
  {
    slug: 'best-sellers',
    title: 'Best Sellers — Phnom Penh Most Wanted',
    eyebrow: 'INDEX 08 · TOP PERFORMERS',
    seoDescription:
      'Shop Sport Castle’s top-selling football boots, 2026/27 European & national team jerseys, retro classics, and F1 teamwear in Phnom Penh.',
    editorialIntro:
      'The most-requested boots, authentic match jerseys, and Formula 1 teamwear across our Sonthormuk, Sen Sok, and Chomkadong branches.',
    preset: { category: 'all', bestSellersOnly: true },
  },
  {
    slug: 'new-arrivals',
    title: 'New Arrivals — Fresh 2026/27 Season Drops',
    eyebrow: 'INDEX 09 · JUST LANDED',
    seoDescription:
      'Explore newly landed 2026/27 national team kits, Champions League shirts, Adidas F50 Messi Edition boots, and 2026 F1 paddock jackets.',
    editorialIntro:
      'Freshly arrived 2026/27 official releases — from Europe, South America, and Asia/ASEAN national strips to Ferrari, Red Bull, Mercedes, and McLaren paddock jackets.',
    preset: { category: 'all', newArrivalsOnly: true },
  },
  {
    slug: 'national-teams',
    title: 'National Team Jerseys — Europe, South America & Asia / ASEAN',
    eyebrow: 'INDEX 10 · INTERNATIONAL ARCHIVE',
    seoDescription:
      'Official Home and Away national team kits for France, Spain, Germany, Italy, Argentina, Brazil, Japan, South Korea, and Cambodia in EU sizes S–XXL.',
    editorialIntro:
      'Filter international matchwear clearly by region: Europe (France, Spain, Germany, Italy), South America (Argentina, Brazil), and Asia / ASEAN (Japan, South Korea, Cambodia).',
    preset: { category: 'jerseys', league: 'International' },
  },
  {
    slug: 'retro-jerseys',
    title: 'Retro Classics & Centenary Archive Kits',
    eyebrow: 'INDEX 11 · HERITAGE ARCHIVE',
    seoDescription:
      'Authentic retro football jerseys including FC Barcelona 1998/99 Centenary, Brazil 2002 World Cup Champions, and 90s heritage third strips.',
    editorialIntro:
      'Iconic tournament silhouettes and club centenary reissues tailored in heavyweight vintage jacquard with optional retro player numbering.',
    preset: { category: 'jerseys', retroOnly: true },
  },
  {
    slug: 'limited-edition',
    title: 'Limited Edition & Collector Releases',
    eyebrow: 'INDEX 12 · LIMITED ALLOCATION',
    seoDescription:
      'Limited edition kits and boots: Real Madrid 125th Anniversary, Barça x Kobe Away, Adidas F50 Messi Signature, Japan Sunrise Wave, and special F1 liveries.',
    editorialIntro:
      'Small-batch collector jerseys, signature athlete boots, and special Grand Prix liveries stocked in limited quantities in Phnom Penh.',
    preset: { category: 'all', limitedEditionOnly: true },
  },
  {
    slug: 'f1-jackets',
    title: '2026 Formula 1 Official Paddock Jackets',
    eyebrow: 'INDEX 13 · PIT-WALL OUTERWEAR',
    seoDescription:
      'Weather-sealed 2026 F1 paddock softshell team jackets for Scuderia Ferrari, Oracle Red Bull Racing, Mercedes-AMG Petronas, and McLaren F1 Team.',
    editorialIntro:
      'Official pit-wall softshell outerwear across all four top Formula 1 constructors — built for trackside style and Phnom Penh monsoon evenings.',
    preset: { category: 'f1', f1GarmentType: 'jacket' },
  },
  {
    slug: 'sale',
    title: 'Atelier Archive & Matchday Markdowns',
    eyebrow: 'INDEX 14 · SEASONAL REDUCTIONS',
    seoDescription:
      'Save on select flagship football boots, futsal shoes, and matchday packs at Sport Castle Phnom Penh.',
    editorialIntro:
      'Curated markdowns on flagship silhouettes — stackable with code CASTLE10 for an extra 10% off at checkout.',
    preset: { category: 'all', saleOnly: true },
  },
];

export const BRAND_PROFILES: BrandProfile[] = [
  {
    slug: 'nike',
    name: 'Nike',
    display: 'NIKE FOOTBALL',
    origin: 'Beaverton, Oregon',
    founded: '1971',
    tagline: 'Air Zoom Speed, Gripknit Touch & Dri-FIT ADV Kits',
    story:
      'From three-quarter length Air Zoom propulsion in the Mercurial Superfly 10 to FlyTouch Pro engineered leather on the Tiempo Legend 10 TF, Nike leads Phnom Penh’s speed and artificial turf ecosystem alongside 2026/27 FC Barcelona, Chelsea, Inter, and PSG authentic kits.',
    signatureTech: ['Air Zoom Forefoot Unit', 'Gripknit Micro-Texture', 'Cyclone 360 Agility Plate', 'Dri-FIT ADV Knit'],
    accentHex: '#0E1113',
    heroImage: STUDIO_IMAGES.mercurial,
    brandFilter: 'Nike',
  },
  {
    slug: 'adidas',
    name: 'Adidas',
    display: 'ADIDAS FOOTBALL',
    origin: 'Herzogenaurach, Germany',
    founded: '1949',
    tagline: 'Predator 25 Fold-Over Tongue, F50 Speed & Real Madrid',
    story:
      'Iconic German football heritage anchored by the returning fold-over tongue Predator 25 Elite, featherweight 178g F50 Laceless, and quilted Copa Pure 2 — paired with official 2026/27 Real Madrid, Arsenal, Liverpool, Bayern Munich, Juventus, and Argentina 3-Star kits.',
    signatureTech: ['Strikeskin Rubber Fins', 'Sprintframe 360', 'Fusionskin Calf Leather', 'HEAT.RDY Cooling Weave'],
    accentHex: '#C8232C',
    heroImage: STUDIO_IMAGES.predator25,
    brandFilter: 'Adidas',
  },
  {
    slug: 'puma',
    name: 'Puma',
    display: 'PUMA FOOTBALL',
    origin: 'Herzogenaurach, Germany',
    founded: '1948',
    tagline: '168g Ultra 5 Carbon, FUZIONFIT360 & Motorsport Heritage',
    story:
      'Bridging elite pitch acceleration and Formula 1 aerodynamics, Puma brings carbon-fiber SPEEDSYSTEM traction in the Ultra 5 Carbon, adaptive lace-optional Future 7 Ultimate MG, and official 2026/27 Manchester City, AC Milan, Dortmund, and Scuderia Ferrari jerseys.',
    signatureTech: ['SPEEDSYSTEM Carbon Plate', 'FUZIONFIT360 Compression', 'PWRTAPE Support', 'ULTRAWEAVE Fabric'],
    accentHex: '#032EA1',
    heroImage: STUDIO_IMAGES.pumaUltra5,
    brandFilter: 'Puma',
  },
  {
    slug: 'mizuno',
    name: 'Mizuno',
    display: 'MIZUNO MADE IN JAPAN',
    origin: 'Osaka, Japan',
    founded: '1906',
    tagline: '24-Hour Lasted K-Leather & KaRVO Spring Speed',
    story:
      'Handcrafted in Mizuno’s Japanese factories over 24-hour lasted molds, the Morelia Neo IV Beta Japan and Mizuno Alpha Elite MIJ deliver unmatched durability and barefoot touch coveted by technical Phnom Penh midfielders playing on both natural grass and 4G artificial turf.',
    signatureTech: ['24-Hour Japanese Lasting', 'Scotchgard K-Leather', 'KaRVO Half-Board Plate', 'ZEROGLIDE α Mesh'],
    accentHex: '#1D4ED8',
    heroImage: STUDIO_IMAGES.moreliaNeo4,
    brandFilter: 'Mizuno',
  },
  {
    slug: 'new-balance',
    name: 'New Balance',
    display: 'NEW BALANCE FOOTBALL',
    origin: 'Boston, Massachusetts',
    founded: '1906',
    tagline: 'Hypoknit Off-Set Lacing & Explosive Straight-Line Pace',
    story:
      'Engineered for explosive wingers who want clean strike zones and anatomical lockdown, New Balance’s Furon v7+ Pro combines featherweight Hypoknit with V-shaped directional chevron studs.',
    signatureTech: ['Hypoknit Strike Upper', 'Off-Set Lacing Canopy', '3D Tongue Tab', 'Nylon Chassis Plate'],
    accentHex: '#B8933B',
    heroImage: STUDIO_IMAGES.nbFuronV7,
    brandFilter: 'New Balance',
  },
  {
    slug: 'varaman',
    name: 'Varaman',
    display: 'VARAMAN CAMBODIA',
    origin: 'Phnom Penh, Cambodia',
    founded: '2021',
    tagline: 'Official Football Federation of Cambodia (FFC) Partner',
    story:
      'Born in Cambodia for the Kouprey faithful. Varaman crafts the official Cambodia National Team Home and Away match kits using tropical-climate micro-mesh adorned with subtle Angkor architectural motifs.',
    signatureTech: ['Tropical Micro-Mesh', 'Woven Angkor Motif', 'Official FFC Crest', 'Same-Day Custom Name Ready'],
    accentHex: '#032EA1',
    heroImage: STUDIO_IMAGES.cambodiaBlue,
    brandFilter: 'Varaman',
  },
  {
    slug: 'select',
    name: 'Select & Match',
    display: 'MATCH BALLS & GK',
    origin: 'Copenhagen · Global Pitch',
    founded: '1947',
    tagline: 'FIFA Quality Pro Match Balls & Pro Goalkeeper Hardware',
    story:
      'Official thermally bonded match spheres, pro goalkeeper gloves, and pitch hardware trusted across Cambodian leagues and club academies.',
    signatureTech: ['FIFA Quality Pro', 'Thermally Bonded Panels', '4mm Contact Latex', 'Zero-Slip Grip'],
    accentHex: '#0E1113',
    heroImage: STUDIO_IMAGES.ballPro,
    categoryFilter: 'balls',
  },
  {
    slug: 'f1-paddock',
    name: 'F1 Paddock',
    display: 'F1 PADDOCK ATELIER',
    origin: 'Maranello · Milton Keynes · Brackley',
    founded: '1950',
    tagline: 'Official 2026 Formula 1 Racing Teamwear',
    story:
      'Curated motorsport team shirts for Cambodia’s growing Formula 1 community — featuring Scuderia Ferrari, Oracle Red Bull Racing, and Mercedes-AMG Petronas with custom driver number pressing.',
    signatureTech: ['Aerodynamic Stretch Weave', 'Laser-Cut Ventilation', 'Official Team Embroidery', 'Driver Number Press'],
    accentHex: '#C8232C',
    heroImage: STUDIO_IMAGES.f1RedBull,
    categoryFilter: 'f1',
  },
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'phnom-penh-artificial-turf-stud-guide',
    title: 'FG vs AG vs TF: Choosing the Right Stud Plate for Phnom Penh’s 7v7 Pitches',
    category: 'Buying Guide',
    author: 'Rithy Sovann',
    authorRole: 'Head Boot Specialist · Sonthormuk Flagship',
    publishedAt: 'November 12, 2026',
    readMinutes: 5,
    excerpt:
      'Wearing long bladed Firm Ground cleats on shallow rubber-crumb artificial turf is the #1 cause of knee strain in Phnom Penh evening leagues. Here is our studio breakdown by pitch surface.',
    heroImage: STUDIO_IMAGES.pitchEditorial,
    sections: [
      {
        id: 'surface-reality',
        heading: '1. Understanding Phnom Penh’s 3G & 4G Turf Surfaces',
        body: [
          'Across Sen Sok, Toul Kork, and Chroy Changvar, over 80% of competitive 5v5 and 7v7 matches are played on medium-pile synthetic turf with crumb rubber infill. Unlike damp European stadium grass, synthetic grass grips bladed FG studs aggressively during sharp lateral cuts.',
          'Switching to dedicated TF (Turf) rubber micro-studs or conical AG-Pro soleplates reduces rotational lock on ankles and knees while keeping soleplate separation from occurring under tropical heat.',
        ],
        callout:
          'Atelier Rule: If you play 2+ nights per week on 7v7 artificial turf, choose TF for shallow carpets and AG-Pro for newer plush 4G fields.',
      },
      {
        id: 'top-silhouettes',
        heading: '2. Our Three Most Tested Phnom Penh Turf Boots',
        body: [
          'For cushioned daily comfort, the Nike Tiempo Legend 10 Pro TF remains our #1 Phnom Penh bestseller — FlyTouch Pro upper refuses to waterlog during monsoon-season rain.',
          'Players moving up to deep 4G turf love the Nike Phantom GX 2 Elite AG-Pro and Mizuno Alpha Elite Made in Japan FG/AG, both engineered with rounded conical stud matrices that release smoothly on turns.',
        ],
      },
      {
        id: 'sizing-note',
        heading: '3. How to Nail Your EU Size on First Try',
        body: [
          'Measure your foot length in centimeters against a wall at the end of the day (when feet naturally expand 2–3mm). Add 0.4cm for match socks or TruSox grip socks, then match directly in our CM-to-EU Fit Calculator.',
        ],
      },
    ],
    featuredProductIds: [
      'boot-tiempo-10-tf',
      'boot-phantom-gx2-ag',
      'boot-mizuno-alpha-japan',
    ],
  },
  {
    slug: '2026-27-ucl-top-5-kit-collector-guide',
    title: '2026/27 Kit Architecture: Inside Barcelona’s Camp Nou Stripes & Real Madrid’s 125th Edition',
    category: 'Kit Culture',
    author: 'Dara Kem',
    authorRole: 'Kit Archivist & Heat-Press Lead',
    publishedAt: 'November 6, 2026',
    readMinutes: 6,
    excerpt:
      'From Nike’s tonal Blaugrana gradient and Kobe-inspired away shirt to Adidas’s return to Liverpool and Real Madrid’s heritage crest, we inspect the finest 2026/27 match jerseys.',
    heroImage: STUDIO_IMAGES.barca2627Home,
    sections: [
      {
        id: 'la-liga-icons',
        heading: '1. La Liga’s Boldest Design Cycle in a Decade',
        body: [
          'FC Barcelona’s 2026/27 Home shirt celebrates the renovated Spotify Camp Nou with architectural gradient stripes across Deep Garnet and Blue Void, while the Away Nike x Kobe Edition brings metallic gold detailing over obsidian obsidian-violet.',
          'In Madrid, Adidas pairs crisp pure white with emerald-mint piping on the Home kit and crowns the season with the limited Real Madrid 125th Anniversary Special Edition.',
        ],
      },
      {
        id: 'heat-press-standards',
        heading: '2. Official Pro Heat-Press Alignment & Care',
        body: [
          'At Sport Castle Sonthormuk and Sen Sok, we press official matte-polyurethane namesets at 150°C with laser-aligned spacing in 15–20 minutes while you wait — including UEFA Champions League starball and Cambodian Premier League sleeve patches.',
        ],
        callout:
          'Always wash printed authentic shirts inside-out in cold water (30°C max) and hang dry in shade — never tumble dry or iron directly over vinyl numbering.',
      },
    ],
    featuredProductIds: [
      'jersey-barca-2627-home',
      'jersey-barca-2627-away',
      'jersey-madrid-125-anniversary',
    ],
  },
  {
    slug: 'k-leather-care-cambodia-monsoon',
    title: 'Preserving Japanese K-Leather & Gripknit Boots in Tropical Monsoon Humidity',
    category: 'Boot Care',
    author: 'Vireak Meas',
    authorRole: 'Footwear Technician · Sen Sok Pitch Hub',
    publishedAt: 'October 28, 2026',
    readMinutes: 4,
    excerpt:
      'Rain-soaked Phnom Penh nights can ruin premium kangaroo leather if dried under direct sunlight or AC heat. Follow our 4-step post-match ritual to double your boot lifespan.',
    heroImage: STUDIO_IMAGES.moreliaNeo4,
    sections: [
      {
        id: 'rinse-stuff',
        heading: '1. Cold Rinse & Unbleached Paper Stuffing',
        body: [
          'Within two hours of leaving a muddy or wet pitch, wipe rubber crumb and clay off the upper and soleplate seam with a damp microfiber cloth and cool water.',
          'Stuff the toe box firmly with dry newspaper or cedar boot trees to absorb moisture overnight while maintaining Mizuno’s 24-hour lasted anatomical shape.',
        ],
      },
      {
        id: 'condition-balm',
        heading: '2. Conditioning Natural Leather vs Synthetic Knit',
        body: [
          'Natural kangaroo leather (Mizuno Morelia Neo IV, Adidas Copa Pure 2) thrives on a pea-sized coat of neutral leather balsam every 3–4 matches. Synthetic Gripknit and Fibertouch uppers simply need cold wiping and shade drying.',
        ],
      },
    ],
    featuredProductIds: [
      'boot-mizuno-morelia-neo-4',
      'boot-copa-pure-2',
      'gear-trusox-3-grip-socks',
    ],
  },
  {
    slug: 'f1-paddock-teamwear-phnom-penh',
    title: 'From Pit Wall to Phnom Penh: Styling 2026 Formula 1 Team Jerseys',
    category: 'Matchday Lookbook',
    author: 'Sokha Chan',
    authorRole: 'Editorial Curator · Sport Castle Atelier',
    publishedAt: 'October 19, 2026',
    readMinutes: 4,
    excerpt:
      'Motorsport jerseys have crossed from race-day grandstands into everyday athletic culture. Explore our 2026 Ferrari, Red Bull Racing, and Mercedes-AMG paddock drops.',
    heroImage: STUDIO_IMAGES.f1Mercedes,
    sections: [
      {
        id: 'paddock-silhouettes',
        heading: '1. Technical Tailoring Meets Everyday Breathability',
        body: [
          'Unlike heavy vintage racing jackets, 2026 F1 team shirts use featherweight aerodynamic stretch mesh built for tropical climates — making them effortless for Sunday Grand Prix watch parties across BKK1 and Riverside.',
        ],
      },
      {
        id: 'custom-driver-press',
        heading: '2. Custom Driver Name & Number Pressing',
        body: [
          'Add #16 LECLERC, #44 HAMILTON, #1 VERSTAPPEN, or your own racing number in our Custom Jersey Studio using Motorsport Aero typography.',
        ],
      },
    ],
    featuredProductIds: [
      'f1-ferrari-team-jersey',
      'f1-redbull-team-jersey',
      'f1-mercedes-team-jersey',
    ],
  },
];

export const CAMPAIGN_LANDINGS: CampaignLanding[] = [
  {
    slug: 'black-friday-pitch-drop',
    badge: 'LIMITED SEASONAL DROP · PHNOM PENH',
    title: 'Black Friday',
    italicAccent: 'Pitch Archive',
    subtitle:
      'Up to 10% off flagship studded soccer boots and 2026/27 match kits — plus automatic free same-day Phnom Penh express delivery over $50.',
    promoCode: 'CASTLE10',
    discountLabel: 'EXTRA 10% OFF SITEWIDE',
    endsLabel: 'Ends Sunday 11:59 PM ICT · In-Store & Online',
    heroImage: STUDIO_IMAGES.predator25,
    editorialNote:
      'Stack code CASTLE10 on already-reduced silhouettes like Predator 25 Elite FT, Puma Ultra 5 Carbon, and Nike Mercurial Vapor 16 AG-Pro, or combine 5+ squad jerseys for an automatic team kit discount.',
    featuredProductIds: [
      'boot-predator-25-elite-ft',
      'boot-puma-ultra-5-carbon',
      'boot-nike-vapor-16-elite-ag',
      'jersey-barca-2627-away',
      'jersey-madrid-125-anniversary',
      'f1-mercedes-team-jersey',
    ],
  },
  {
    slug: 'ucl-2026-27-launch',
    badge: '2026/27 EUROPEAN NIGHTS · OFFICIAL KITS',
    title: 'Champions League',
    italicAccent: 'Kit Atelier',
    subtitle:
      'Complete 2026/27 Home, Away & Third match jerseys across La Liga, Premier League, Serie A, Bundesliga & Ligue 1 — pressed with official UCL starball patches in 15 minutes.',
    promoCode: 'CASTLE10',
    discountLabel: '10% OFF + SAME-DAY PRESS',
    endsLabel: 'Stocked at Sonthormuk, Sen Sok & Chomkadong',
    heroImage: STUDIO_IMAGES.psg2627ThirdUcl,
    editorialNote:
      'Every 2026/27 kit in our collection is verified authentic retail stock with breathable match-grade knit, official woven/heat-applied crests, and instant live customization.',
    featuredProductIds: [
      'jersey-barca-2627-home',
      'jersey-madrid-2627-home',
      'jersey-arsenal-2627-home',
      'jersey-liverpool-2627-home',
      'jersey-psg-2627-third-ucl',
      'ball-adidas-pro-fifa',
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Orders & Delivery',
    question: 'How fast is delivery inside Phnom Penh?',
    answer:
      'Orders placed before 6:30 PM ICT are dispatched same-day by our Phnom Penh rider network across all 12 Khans (1.5–3 hours). Orders over $50.00 qualify for FREE express delivery; orders under $50 carry a flat $2.50 rider fee.',
  },
  {
    id: 'faq-2',
    category: 'Orders & Delivery',
    question: 'Do you ship to Siem Reap, Sihanoukville, Battambang, and other provinces?',
    answer:
      'Yes! We dispatch daily via Virak Buntham Express and J&T Cambodia to all 25 provinces with next-day pickup or doorstep drop-off. Provincial shipping is $3.50 flat or FREE on orders over $90.',
  },
  {
    id: 'faq-3',
    category: 'Orders & Delivery',
    question: 'Can I reserve online and pick up in store?',
    answer:
      'Absolutely. Select "In-Store Pickup" at checkout and choose Sonthormuk Flagship, Sen Sok Pitch Hub, or Chomkadong South. Your order is held for 48 hours and you can try boots on our turf strip before leaving.',
  },
  {
    id: 'faq-4',
    category: 'Payments & KHQR',
    question: 'What payment methods does Sport Castle accept?',
    answer:
      'We accept ABA KHQR (USD & KHR), Wing, ACLEDA, Visa/Mastercard, Apple Pay, Google Pay, PayPal, and Cash on Delivery (COD) within Phnom Penh. All dual KHR totals convert cleanly at 1 USD = 4,100 KHR.',
  },
  {
    id: 'faq-5',
    category: 'Payments & KHQR',
    question: 'Can I combine promo code CASTLE10 with team bulk discounts?',
    answer:
      'Yes — ordering 5 or more jerseys automatically unlocks our 10% Squad Kit Discount, and eligible seasonal orders can also apply CASTLE10 at cart or checkout for instant calculation.',
  },
  {
    id: 'faq-6',
    category: 'Sizing & Surfaces',
    question: 'Which outsole should I pick for Phnom Penh 5v5 / 7v7 artificial turf?',
    answer:
      'Choose TF (Turf) for shorter rubber-crumb carpets (most 5v5/7v7 venues) or AG / FG-AG conical studs for deep 4G artificial grass. Avoid aggressive bladed FG cleats on shallow turf to prevent knee torque and premature sole separation.',
  },
  {
    id: 'faq-7',
    category: 'Sizing & Surfaces',
    question: 'Do Nike Mercurial and Adidas F50 speed boots run narrow?',
    answer:
      'Yes, pro speed silos are built for tight lockdown. If you have medium-to-wide feet, we recommend sizing up 0.5 EU or choosing the Mizuno Morelia Neo IV / Puma Future 7 Ultimate for adaptive forefoot width.',
  },
  {
    id: 'faq-8',
    category: 'Custom Print & Care',
    question: 'How long does custom jersey name & number heat-pressing take?',
    answer:
      'Our Sonthormuk and Sen Sok heat-press labs complete single jerseys in 15–20 minutes (same-day dispatch!). Team squad sets of 10–15 shirts are ready within 3–4 hours.',
  },
  {
    id: 'faq-9',
    category: 'Custom Print & Care',
    question: 'How should I wash my custom-printed 2026/27 jersey?',
    answer:
      'Turn the shirt inside-out, wash cold (max 30°C) on a gentle cycle without fabric softener, and air-dry in the shade. Never tumble-dry or apply an iron directly to heat-pressed vinyl letters or patches.',
  },
  {
    id: 'faq-10',
    category: 'Returns & Warranty',
    question: 'What is your return and size exchange policy?',
    answer:
      'Unworn boots (tried indoors only, clean soleplate) and unprinted jerseys with original tags can be exchanged for a different size or returned within 30 days via our automated Returns & Exchanges Portal (/pages/returns) or any Phnom Penh branch.',
  },
  {
    id: 'faq-11',
    category: 'Returns & Warranty',
    question: 'Are custom-printed jerseys returnable?',
    answer:
      'Custom heat-pressed jerseys (custom name, number, or sleeve patch) are final sale unless there is a manufacturing defect or print error on our part — in which case we reprint and replace it free of charge within 24 hours.',
  },
  {
    id: 'faq-12',
    category: 'Returns & Warranty',
    question: 'Do football boots include a soleplate warranty?',
    answer:
      'All authentic boots carry a 60-day manufacturer defect warranty when used on their designated playing surface (e.g., TF/AG on turf, FG on natural grass). Submit photos through our Contact page or bring them to Sonthormuk for immediate inspection.',
  },
];

export const INITIAL_PRODUCT_QUESTIONS: ProductQuestion[] = [
  {
    id: 'qa-1',
    productId: 'boot-predator-25-elite-ft',
    author: 'Borey K.',
    question: 'Does the elastic tongue strap stay tight during wet rainy-season games?',
    answer:
      'Yes — the 2025 elastic strap wraps beneath the midfoot soleplate channel and stays locked in heavy rain without loosening.',
    date: 'Nov 10, 2026',
  },
  {
    id: 'qa-2',
    productId: 'jersey-barca-2627-home',
    author: 'Sophea T.',
    question: 'Is this the authentic player weave or standard stadium replica? And can I add YAMAL #10?',
    answer:
      'This is the 2026/27 Authentic Dri-FIT ADV match cut with breathable engineered knit. Toggle Live Custom Jersey Printing right above Add to Bag to add YAMAL #10 and the official UCL sleeve patch same day.',
    date: 'Nov 14, 2026',
  },
  {
    id: 'qa-3',
    productId: 'boot-tiempo-10-tf',
    author: 'Makara S.',
    question: 'Good for Sen Sok artificial grass pitches when it rains?',
    answer:
      'Our #1 pick for rainy Phnom Penh turf! FlyTouch Pro engineered leather does not absorb water and the rubber TF outsole grips wet crumb rubber smoothly.',
    date: 'Nov 08, 2026',
  },
];

export const LEGAL_POLICIES: Record<PolicySlug, PolicyDocument> = {
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    updatedAt: 'November 1, 2026',
    summary:
      'How Sport Castle Cambodia collects, protects, and respects your personal data across our web storefront and Phnom Penh branches (aligned with GDPR, CCPA/CPRA, and Cambodia E-Commerce Law).',
    sections: [
      {
        heading: '1. Information We Collect',
        paragraphs: [
          'When you place an order, customize a jersey, or create a Sport Castle Club account, we collect only the details needed to fulfill your purchase: full name, phone number, Telegram handle (optional for rider coordination), email address, delivery address, and preferred boot/jersey fit sizes.',
          'Payment card numbers are never stored in raw form on Sport Castle servers; tokenized cards and KHQR transactions are processed securely through PCI-DSS compliant payment gateways.',
        ],
      },
      {
        heading: '2. How We Use & Share Data',
        paragraphs: [
          'We use your information to dispatch Phnom Penh riders, prepare heat-press printing, provide order status notifications, calculate Club loyalty points, and prevent fraudulent transactions.',
          'We never sell personal data to third-party brokers. Limited delivery metadata (recipient name, phone, Khan/Sangkat address) is shared strictly with our verified local courier partners (Phnom Penh Express Riders, Virak Buntham, J&T Cambodia).',
        ],
      },
      {
        heading: '3. Your Privacy Rights (GDPR / CCPA / CPRA)',
        paragraphs: [
          'You have the right to access, export, correct, or request permanent deletion of your account data at any time. You can also opt out of analytics or marketing cookies via our Cookie Policy preferences panel or by emailing privacy@sportcastle.com.kh.',
        ],
      },
    ],
  },
  'terms-of-service': {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    updatedAt: 'November 1, 2026',
    summary:
      'Governing terms for browsing, purchasing, customizing jerseys, and redeeming gift cards on Sport Castle Cambodia.',
    sections: [
      {
        heading: '1. Authenticity & Product Representation',
        paragraphs: [
          'Every product sold by Sport Castle is sourced through authorized regional and official brand channels. Studio imagery accurately reflects colorways, though minor monitor calibration differences may occur.',
        ],
      },
      {
        heading: '2. Pricing, Dual Currency & Errors',
        paragraphs: [
          'All catalog prices are denominated in United States Dollars (USD) with Cambodian Riel (KHR) equivalents calculated at the standard retail reference rate of 1 USD = 4,100 KHR. In the rare event of a typographical pricing error, we reserve the right to cancel and immediately refund the affected item.',
        ],
      },
      {
        heading: '3. Custom Printing & Intellectual Property',
        paragraphs: [
          'Customers submitting custom jersey names affirm that printed text does not violate trademark law or contain abusive language. All Sport Castle photography, custom UI architecture, editorial guides, and branding remain the intellectual property of Sport Castle Co., Ltd.',
        ],
      },
    ],
  },
  'shipping-policy': {
    slug: 'shipping-policy',
    title: 'Shipping & Delivery Policy',
    updatedAt: 'November 1, 2026',
    summary:
      'Same-day Phnom Penh express dispatch, 25-province Cambodian courier tiers, in-store branch pickup, and international shipping guidelines.',
    sections: [
      {
        heading: '1. Phnom Penh Express Delivery (Same-Day)',
        paragraphs: [
          'Orders placed before 6:30 PM ICT arrive within 1.5–3 hours across all 12 Phnom Penh Khans. Free shipping automatically activates at $50.00+; orders under $50.00 incur a flat $2.50 rider dispatch fee.',
        ],
      },
      {
        heading: '2. Cambodia Provincial & International Shipping',
        paragraphs: [
          'Provincial orders (Siem Reap, Sihanoukville, Kampot, Battambang, etc.) ship daily at 5:00 PM via Virak Buntham / J&T Express ($3.50 flat, free over $90). International DHL Express shipping is available across ASEAN and worldwide ($24 flat; destination import duties and taxes remain the responsibility of the recipient).',
        ],
      },
      {
        heading: '3. Lost or Damaged Parcels',
        paragraphs: [
          'All parcels are photographed before dispatch. If a package arrives damaged or goes missing in transit for more than 5 business days, contact support@sportcastle.com.kh with your Order ID for immediate replacement or full refund.',
        ],
      },
    ],
  },
  'refund-policy': {
    slug: 'refund-policy',
    title: 'Refund & 30-Day Return Policy',
    updatedAt: 'November 1, 2026',
    summary:
      'Hassle-free 30-day size exchanges and returns via our automated RMA portal or any Phnom Penh branch.',
    sections: [
      {
        heading: '1. 30-Day Eligibility & Condition Requirements',
        paragraphs: [
          'Footwear must be unworn outdoors with completely clean studs/outsoles and original box intact. Jerseys and apparel must be unwashed, unworn, with original retail swing tags attached.',
        ],
      },
      {
        heading: '2. Non-Returnable Items',
        paragraphs: [
          'Custom heat-pressed jerseys (personalized names, numbers, or sleeve patches), opened grip socks for hygiene reasons, and redeemed digital gift cards cannot be returned unless defective.',
        ],
      },
      {
        heading: '3. Refund Timelines',
        paragraphs: [
          'Once inspected at our Sonthormuk warehouse, ABA KHQR and Wing refunds are processed within 24 hours; Visa/Mastercard refunds appear within 3–5 business days depending on your issuing bank. Instant Store Credit and size exchanges ship the same day.',
        ],
      },
    ],
  },
  'cookie-policy': {
    slug: 'cookie-policy',
    title: 'Cookie Policy & Preferences',
    updatedAt: 'November 1, 2026',
    summary:
      'Transparent breakdown of Essential, Analytics, and Marketing storage used on Sport Castle, paired with instant consent controls below.',
    sections: [
      {
        heading: '1. Essential Storage (Always Active)',
        paragraphs: [
          'Required for core storefront operation: persisting your shopping bag, saved wishlist items, custom jersey configurations, Club authentication session, and promo code state.',
        ],
      },
      {
        heading: '2. Performance & Analytics Cookies',
        paragraphs: [
          'Helps us understand which playing surfaces, boot sizes, and 2026/27 kits Phnom Penh players search for most so we keep the right branch inventory in stock.',
        ],
      },
      {
        heading: '3. Marketing & Restock Personalization',
        paragraphs: [
          'Enables tailored Matchday Lookbook pairings, restock notifications for saved items, and seasonal drop reminders. Toggle your preferences anytime using the interactive control panel on this page.',
        ],
      },
    ],
  },
};

export const COLLECTION_BY_SLUG = new Map(
  COLLECTION_CATALOG.map((c) => [c.slug, c]),
);

export const BRAND_BY_SLUG = new Map(
  BRAND_PROFILES.map((b) => [b.slug, b]),
);

export const BLOG_BY_SLUG = new Map(
  BLOG_ARTICLES.map((a) => [a.slug, a]),
);

export const CAMPAIGN_BY_SLUG = new Map(
  CAMPAIGN_LANDINGS.map((c) => [c.slug, c]),
);
