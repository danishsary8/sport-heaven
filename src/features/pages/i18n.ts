export const pagesEn = {
  'help.title': 'Help',
  'help.draft': "Draft: waiting for the owner's review.",
  'help.englishOnly': 'This page is only in English for now.',
  'help.seeStores': 'See our stores',
  'stores.title': 'Our stores',
  'stores.body': 'Three stores in Phnom Penh. Try on boots and kits, or pick up your online order.',
  'stores.telegram': 'Telegram {handle}',
  'stores.pickup': 'Pickup for online orders',
  'stores.noPickup': 'No pickup for online orders at this store',
  'stores.maps': 'Open in Google Maps',
  'stores.mapsFor': 'Open {name} in Google Maps',
} as const;

export const pagesKm: Record<keyof typeof pagesEn, string> = {
  'help.title': 'ជំនួយ',
  'help.draft': 'សេចក្តីព្រាង៖ កំពុងរង់ចាំម្ចាស់ហាងពិនិត្យ។',
  'help.englishOnly': 'ទំព័រនេះមានជាភាសាអង់គ្លេសតែប៉ុណ្ណោះនៅឡើយ។',
  'help.seeStores': 'មើលហាងរបស់យើង',
  'stores.title': 'ហាងរបស់យើង',
  'stores.body': 'ហាងបីនៅភ្នំពេញ។ មកសាកស្បែកជើង និងអាវ ឬមកយកការបញ្ជាទិញតាមអនឡាញ។',
  'stores.telegram': 'Telegram {handle}',
  'stores.pickup': 'អាចមកយកការបញ្ជាទិញតាមអនឡាញ',
  'stores.noPickup': 'ហាងនេះមិនទទួលការមកយកការបញ្ជាទិញតាមអនឡាញទេ',
  'stores.maps': 'បើកក្នុង Google Maps',
  'stores.mapsFor': 'បើក {name} ក្នុង Google Maps',
};
