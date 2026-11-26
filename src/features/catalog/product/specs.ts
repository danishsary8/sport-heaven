/** "careGuide" → "Care guide". The API's spec keys are English; Khmer pages show them in English (OWNER-TODO). */
export function humaniseKey(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
