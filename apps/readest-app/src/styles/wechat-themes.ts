import plugin from 'tailwindcss/plugin';
import { themeVariables, type Palette } from './themes';

const light: Palette = {
  'base-100': '#FFFEF5',
  'base-200': '#F1ECD8',
  'base-300': '#C7EDCC',
  'base-content': '#1A1A1A',
  neutral: '#666666',
  'neutral-content': '#999999',
  primary: '#07C160',
  secondary: '#06AD56',
  accent: '#05944A',
};

const dark: Palette = {
  ...light,
  'base-100': '#1A1A1A',
  'base-200': '#2A2A2A',
  'base-300': '#333333',
  'base-content': 'rgba(255,255,255,0.87)',
  neutral: 'rgba(255,255,255,0.60)',
  'neutral-content': 'rgba(255,255,255,0.38)',
};

export default plugin(({ addBase }) => {
  addBase({
    '[data-theme="wr-light"]': themeVariables(light, 'light'),
    '[data-theme="wr-dark"]': themeVariables(dark, 'dark'),
  });
});
