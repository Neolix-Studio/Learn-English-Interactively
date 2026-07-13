import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hu from './locales/hu.json';
import sk from './locales/sk.json';

const resources = {
  hu: {
    translation: hu
  },
  sk: {
    translation: sk
  }
};

const hostname = window.location.hostname;
let defaultLng = localStorage.getItem('guest_base_language') || 'hu';

const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');

// Strict domain enforcement or URL override
if (langParam && (langParam === 'sk' || langParam === 'hu')) {
  defaultLng = langParam;
  localStorage.setItem('guest_base_language', langParam); // Save it for persistence
} else if (hostname.endsWith('.sk')) {
  defaultLng = 'sk';
} else if (hostname.endsWith('.hu')) {
  defaultLng = 'hu';
}
// .eu or localhost fall back to the localStorage value (defaulting to hu)

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLng, // Determined by domain or localStorage
    fallbackLng: 'hu',
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  });

export default i18n;
