import { parseAppLanguage, translate } from './translations';

if (parseAppLanguage('fil') !== 'fil' || parseAppLanguage('en') !== 'en') {
  throw new Error('Supported app languages should be restored from storage.');
}
if (parseAppLanguage(null) !== 'en' || parseAppLanguage('unsupported') !== 'en') {
  throw new Error('Missing or unsupported saved languages should fall back to English.');
}
if (
  translate('fil', 'profile.resumeReady', { fileName: 'resume.pdf' }) !==
  'Handa na ang resume: resume.pdf'
) {
  throw new Error('Translations should use the selected language and interpolate values.');
}
if (translate('en', 'settings.language') !== 'App language') {
  throw new Error('English should remain the default translation.');
}
if (
  translate('en', 'tab.home') !== 'Home' ||
  translate('fil', 'tab.home') !== 'Tahanan' ||
  translate('fil', 'tab.profile') !== 'Profile Ko'
) {
  throw new Error('Applicant tab labels should use the selected language.');
}

console.log('localization tests passed');
