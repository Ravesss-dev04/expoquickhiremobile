const quickHireTokens = require('./src/constants/design-tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: quickHireTokens.colors,
      spacing: quickHireTokens.spacing,
      borderRadius: quickHireTokens.borderRadius,
      fontSize: quickHireTokens.fontSize,
      fontFamily: quickHireTokens.fontFamily,
    },
  },
  plugins: [],
};