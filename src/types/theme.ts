export type AccentColor =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan';

export interface AccentThemeConfig {
  id: AccentColor;
  name: string;
  nameId: string;
  hex: string;
  hover: string;
  light: string;
  darkLight: string;
  border: string;
  darkBorder: string;
  text: string;
  darkText: string;
  fg: string;
  ring: string;
}

export const ACCENT_COLORS: AccentThemeConfig[] = [
  {
    id: 'blue',
    name: 'Blue',
    nameId: 'Biru',
    hex: '#0d6efd',
    hover: '#0b5ed7',
    light: '#e7f1ff',
    darkLight: 'rgba(13, 110, 253, 0.18)',
    border: '#b6d4fe',
    darkBorder: 'rgba(13, 110, 253, 0.35)',
    text: '#084298',
    darkText: '#6ea8fe',
    fg: '#ffffff',
    ring: 'rgba(13, 110, 253, 0.35)',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    nameId: 'Nila',
    hex: '#6610f2',
    hover: '#590ecc',
    light: '#f0e7fe',
    darkLight: 'rgba(102, 16, 242, 0.18)',
    border: '#d1b7fb',
    darkBorder: 'rgba(102, 16, 242, 0.35)',
    text: '#430a9f',
    darkText: '#a370f7',
    fg: '#ffffff',
    ring: 'rgba(102, 16, 242, 0.35)',
  },
  {
    id: 'purple',
    name: 'Purple',
    nameId: 'Ungu',
    hex: '#6f42c1',
    hover: '#5e37a6',
    light: '#f1ebf9',
    darkLight: 'rgba(111, 66, 193, 0.18)',
    border: '#d5c6ed',
    darkBorder: 'rgba(111, 66, 193, 0.35)',
    text: '#492b81',
    darkText: '#aa8ddb',
    fg: '#ffffff',
    ring: 'rgba(111, 66, 193, 0.35)',
  },
  {
    id: 'pink',
    name: 'Pink',
    nameId: 'Merah Muda',
    hex: '#d63384',
    hover: '#b62b70',
    light: '#fbe7f0',
    darkLight: 'rgba(214, 51, 132, 0.18)',
    border: '#f3b1d3',
    darkBorder: 'rgba(214, 51, 132, 0.35)',
    text: '#8a2055',
    darkText: '#e685b5',
    fg: '#ffffff',
    ring: 'rgba(214, 51, 132, 0.35)',
  },
  {
    id: 'red',
    name: 'Red',
    nameId: 'Merah',
    hex: '#dc3545',
    hover: '#bb2d3b',
    light: '#fde8ea',
    darkLight: 'rgba(220, 53, 69, 0.18)',
    border: '#f8b4b9',
    darkBorder: 'rgba(220, 53, 69, 0.35)',
    text: '#842029',
    darkText: '#ea868f',
    fg: '#ffffff',
    ring: 'rgba(220, 53, 69, 0.35)',
  },
  {
    id: 'orange',
    name: 'Orange',
    nameId: 'Oranye',
    hex: '#fd7e14',
    hover: '#dc6a0b',
    light: '#fff0e4',
    darkLight: 'rgba(253, 126, 20, 0.18)',
    border: '#fed1a8',
    darkBorder: 'rgba(253, 126, 20, 0.35)',
    text: '#9e4e08',
    darkText: '#feb272',
    fg: '#ffffff',
    ring: 'rgba(253, 126, 20, 0.35)',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    nameId: 'Kuning',
    hex: '#ffc107',
    hover: '#ffca2c',
    light: '#fff8e1',
    darkLight: 'rgba(255, 193, 7, 0.18)',
    border: '#ffe699',
    darkBorder: 'rgba(255, 193, 7, 0.35)',
    text: '#664d03',
    darkText: '#ffda6a',
    fg: '#212529',
    ring: 'rgba(255, 193, 7, 0.35)',
  },
  {
    id: 'green',
    name: 'Green',
    nameId: 'Hijau',
    hex: '#198754',
    hover: '#157347',
    light: '#e8f5e9',
    darkLight: 'rgba(25, 135, 84, 0.18)',
    border: '#a3cfbb',
    darkBorder: 'rgba(25, 135, 84, 0.35)',
    text: '#0f5132',
    darkText: '#75b798',
    fg: '#ffffff',
    ring: 'rgba(25, 135, 84, 0.35)',
  },
  {
    id: 'teal',
    name: 'Teal',
    nameId: 'Toska (Teal)',
    hex: '#20c997',
    hover: '#1aa179',
    light: '#e6f9f4',
    darkLight: 'rgba(32, 201, 151, 0.18)',
    border: '#a6ebd8',
    darkBorder: 'rgba(32, 201, 151, 0.35)',
    text: '#136b53',
    darkText: '#79dfc1',
    fg: '#ffffff',
    ring: 'rgba(32, 201, 151, 0.35)',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    nameId: 'Sian (Cyan)',
    hex: '#0dcaf0',
    hover: '#0baccc',
    light: '#e6faff',
    darkLight: 'rgba(13, 202, 240, 0.18)',
    border: '#9eeaf9',
    darkBorder: 'rgba(13, 202, 240, 0.35)',
    text: '#087990',
    darkText: '#6edff6',
    fg: '#212529',
    ring: 'rgba(13, 202, 240, 0.35)',
  },
];
