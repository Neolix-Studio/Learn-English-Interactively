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
const landParam = urlParams.get('land');

if (landParam && (landParam === 'sk' || landParam === 'hu')) {
  defaultLng = landParam;
  localStorage.setItem('guest_base_language', landParam);
} else if (langParam && (langParam === 'sk' || langParam === 'hu')) {
  defaultLng = langParam;
  localStorage.setItem('guest_base_language', langParam);
} else if (hostname.endsWith('.sk')) {
  defaultLng = 'sk';
} else if (hostname.endsWith('.hu')) {
  defaultLng = 'hu';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLng,
    fallbackLng: 'hu',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
