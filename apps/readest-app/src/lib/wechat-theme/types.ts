export type ReadingBackground = 'white' | 'green' | 'yellow' | 'dark';

export type FontSizeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type FontFamilyMode = 'sans' | 'serif';

export type PageTurnStyle = 'slide' | 'crossfade' | 'flip';

export type HighlightColor = 'yellow' | 'blue' | 'green' | 'red' | 'purple';

export type HighlightStyle = 'underline' | 'wavy' | 'highlight';

export interface HighlightColorSet {
  yellow: string;
  blue: string;
  green: string;
  red: string;
  purple: string;
}

export interface WeChatReaderSettings {
  background: ReadingBackground;
  fontSizeLevel: FontSizeLevel;
  fontFamily: FontFamilyMode;
  lineHeight: number;
  letterSpacing: number;
  marginHorizontal: number;
  pageTurnStyle: PageTurnStyle;
  isEInk: boolean;
}
