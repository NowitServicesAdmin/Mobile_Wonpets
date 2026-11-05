import 'react-native';

declare module 'react-native' {
  interface TextProps {
    /** Keep this text exactly as written (e.g. language names) - the Settings language switcher will not translate it. */
    noTranslate?: boolean;
  }
}