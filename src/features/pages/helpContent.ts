import type { Lang } from '../../lib/i18n';

export interface HelpBlock {
  heading?: string;
  text?: string[];
  list?: string[];
}
export interface HelpTopic {
  title: string;
  summary: string;
  blocks: HelpBlock[];
  /** Legal text waiting for the owner's review (shown with a banner). */
  draft?: boolean;
}

export const TOPICS = ['delivery', 'returns', 'size-guide', 'contact', 'about', 'terms', 'privacy'] as const;
export type TopicId = (typeof TOPICS)[number];

/**
 * Help copy written from the shop's real rules (seeded settings, November 2026). When the owner changes
 * delivery fees or return windows in the admin, this text must be edited too (OWNER-TODO).
 */
const en: Record<TopicId, HelpTopic> = {
  delivery: {
    title: 'Delivery and pickup',
    summary: 'Phnom Penh rider, province courier, or free pickup at our stores.',
    blocks: [
      { heading: 'Phnom Penh', text: ['A rider brings your order the same day or the next day. Delivery is $2.50, and free on orders over $50.'] },
      { heading: 'Provinces', text: ['We send orders to every province with a courier. It takes 2 to 3 days and costs $3.00.'] },
      { heading: 'Pick up in store', text: ['Choose a store at checkout and collect your order for free, usually the same day. Bring your order number.'] },
      { heading: 'Good to know', list: ['The exact fee and timing show at checkout before you pay.', 'Your items are held for 30 minutes while you pay. If the time runs out, they go back on sale.', 'You can follow your order on the Track an order page with your order number and phone.'] },
    ],
  },
  returns: {
    title: 'Returns and exchanges',
    summary: 'Exchange a size within 30 days, or get a refund within 14 days.',
    blocks: [
      { heading: 'Exchanges', text: ['You can exchange an item for another size within 30 days of receiving it, as long as it is unworn with its tags.'] },
      { heading: 'Refunds', text: ['You can return an item for a refund within 14 days of receiving it, unworn with its tags. We refund the way you paid.'] },
      { heading: 'What we cannot take back', list: ['Socks and underwear, for hygiene reasons.', 'Items that have been worn, washed or damaged.'] },
      { heading: 'How to start', text: ['Members can start a return from Your account, Orders. Guests can bring the item and the order number to any of our stores, or contact us.'] },
    ],
  },
  'size-guide': {
    title: 'Size guide',
    summary: 'How to find your size for boots, shirts and balls.',
    blocks: [
      { heading: 'Boots', text: ['Measure your foot from heel to longest toe in centimetres, then pick the size with that foot length on the product page’s size guide. Between sizes? Take the larger one.'] },
      { heading: 'Shirts and jackets', text: ['Measure around the fullest part of your chest and compare it with the chart on the product page. Authentic match shirts fit closer than fan versions.'] },
      { heading: 'Balls', text: ['Size 5 is for players aged 12 and up, size 4 for ages 8 to 12, size 3 for younger children.'] },
      { text: ['Every product page has its own size guide next to the sizes. You are also welcome to try things on in our stores.'] },
    ],
  },
  contact: {
    title: 'Contact us',
    summary: 'Call, message or visit one of our three stores.',
    blocks: [
      { text: ['The quickest way to reach us is to call or message the store nearest to you. Phone numbers, Telegram and opening hours are on the stores page.'] },
      { heading: 'About an order', text: ['Have your order number ready. We never ask for your ABA password or card PIN.'] },
    ],
  },
  about: {
    title: 'About Sport Heaven',
    summary: 'A football and motorsport shop with three stores in Phnom Penh.',
    blocks: [
      { text: ['Sport Heaven sells football boots, club and national team kits, match balls and F1 teamwear from three stores in Phnom Penh: Sen Sok, Chomkadong and Sonthormuk.', 'Order online and pay with ABA KHQR or a card, or reserve and pick up in store.'] },
    ],
  },
  terms: {
    title: 'Terms of sale',
    summary: 'The rules for buying from Sport Heaven.',
    draft: true,
    blocks: [
      { heading: 'Prices', text: ['Prices are in US dollars. The price you pay is the one shown at checkout.'] },
      { heading: 'Orders and payment', text: ['Your order is confirmed once payment is received, or, for pickup orders paid in store, once you collect and pay. Unpaid items are held for 30 minutes.'] },
      { heading: 'Delivery', text: ['Delivery times are estimates. See Delivery and pickup.'] },
      { heading: 'Returns', text: ['See Returns and exchanges.'] },
      { heading: 'Personalised items', text: ['Shirts printed with a name and number are made for you.'] },
    ],
  },
  privacy: {
    title: 'Privacy',
    summary: 'What we keep about you and why.',
    draft: true,
    blocks: [
      { heading: 'What we keep', list: ['Your name, phone number and, if you give it, your email.', 'Your delivery addresses and your orders.', 'Your points and member tier.'] },
      { heading: 'Why', text: ['To deliver your orders, contact you about them, and give you member prices and points.'] },
      { heading: 'What we do not do', list: ['We do not sell your details.', 'We do not use advertising trackers on this site.'] },
      { heading: 'Your choices', text: ['You can change your details or delete your account from Your account, Profile. Orders still being delivered are kept until they are finished.'] },
    ],
  },
};

const km: Partial<Record<TopicId, HelpTopic>> = {
  delivery: {
    title: 'ការដឹកជញ្ជូន និងការមកយក',
    summary: 'អ្នកដឹកនៅភ្នំពេញ ក្រុមហ៊ុនដឹកទៅខេត្ត ឬមកយកដោយឥតគិតថ្លៃនៅហាង។',
    blocks: [
      { heading: 'ភ្នំពេញ', text: ['អ្នកដឹកនឹងយកការបញ្ជាទិញរបស់អ្នកមកក្នុងថ្ងៃដដែល ឬថ្ងៃបន្ទាប់។ ថ្លៃដឹក $2.50 និងឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញលើស $50។'] },
      { heading: 'ខេត្ត', text: ['យើងផ្ញើទៅគ្រប់ខេត្តតាមក្រុមហ៊ុនដឹកជញ្ជូន។ ចំណាយពេល 2 ទៅ 3 ថ្ងៃ និងថ្លៃ $3.00។'] },
      { heading: 'មកយកនៅហាង', text: ['ជ្រើសរើសហាងនៅពេលបញ្ជាទិញ ហើយមកយកដោយឥតគិតថ្លៃ ជាធម្មតាក្នុងថ្ងៃដដែល។ សូមយកលេខបញ្ជាទិញមកជាមួយ។'] },
      { heading: 'គួរដឹង', list: ['ថ្លៃ និងពេលវេលាពិតប្រាកដ បង្ហាញនៅពេលបញ្ជាទិញ មុនពេលអ្នកបង់ប្រាក់។', 'ទំនិញរបស់អ្នកត្រូវបានរក្សាទុក 30 នាទី ខណៈពេលអ្នកបង់ប្រាក់។', 'អ្នកអាចតាមដានការបញ្ជាទិញនៅទំព័រតាមដាន ដោយប្រើលេខបញ្ជាទិញ និងលេខទូរស័ព្ទ។'] },
    ],
  },
  returns: {
    title: 'ការប្រគល់ និងការប្តូរ',
    summary: 'ប្តូរទំហំក្នុងរយៈពេល 30 ថ្ងៃ ឬទទួលប្រាក់វិញក្នុងរយៈពេល 14 ថ្ងៃ។',
    blocks: [
      { heading: 'ការប្តូរ', text: ['អ្នកអាចប្តូរទំនិញជាទំហំផ្សេងក្នុងរយៈពេល 30 ថ្ងៃ (30 days) បន្ទាប់ពីទទួលបាន ប្រសិនបើមិនទាន់ពាក់ និងនៅមានស្លាក។'] },
      { heading: 'ការសងប្រាក់វិញ', text: ['អ្នកអាចប្រគល់ទំនិញវិញដើម្បីទទួលប្រាក់វិញក្នុងរយៈពេល 14 ថ្ងៃ ប្រសិនបើមិនទាន់ពាក់ និងនៅមានស្លាក។ យើងសងតាមវិធីដែលអ្នកបានបង់។'] },
      { heading: 'អ្វីដែលយើងមិនអាចទទួលវិញ', list: ['ស្រោមជើង និងខោអាវក្នុង ដោយសារអនាម័យ។', 'ទំនិញដែលបានពាក់ លាង ឬខូច។'] },
      { heading: 'របៀបចាប់ផ្តើម', text: ['សមាជិកអាចចាប់ផ្តើមការប្រគល់ពី គណនីរបស់អ្នក ការបញ្ជាទិញ។ ភ្ញៀវអាចយកទំនិញ និងលេខបញ្ជាទិញមកហាងណាមួយ ឬទាក់ទងមកយើង។'] },
    ],
  },
  contact: {
    title: 'ទាក់ទងមកយើង',
    summary: 'ហៅ ផ្ញើសារ ឬមកកាន់ហាងមួយក្នុងចំណោមហាងទាំងបី។',
    blocks: [
      { text: ['វិធីលឿនបំផុតគឺហៅ ឬផ្ញើសារទៅហាងដែលនៅជិតអ្នក។ លេខទូរស័ព្ទ Telegram និងម៉ោងបើក មាននៅទំព័រហាង។'] },
      { heading: 'អំពីការបញ្ជាទិញ', text: ['សូមត្រៀមលេខបញ្ជាទិញរបស់អ្នក។ យើងមិនដែលសុំពាក្យសម្ងាត់ ABA ឬលេខ PIN កាតរបស់អ្នកទេ។'] },
    ],
  },
};

/** The topic in the chosen language; English (with a note) where no translation exists yet. */
export function helpTopic(id: TopicId, lang: Lang): { topic: HelpTopic; englishOnly: boolean } {
  const translated = lang === 'km' ? km[id] : undefined;
  return { topic: translated ?? en[id], englishOnly: lang === 'km' && !translated };
}
