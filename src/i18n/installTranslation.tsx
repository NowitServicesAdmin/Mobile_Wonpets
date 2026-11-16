import React, { useSyncExternalStore } from 'react';
import { getLanguageCode, getVersion, subscribe, tr } from './translator';

/**
 * Makes every <Text> and TextInput placeholder in the app translatable without touching any screen.
 * Import this ONCE at the top of App.tsx (before anything renders). Opt a piece of text out with <Text noTranslate>.
 *
 * React Native 0.8x+ ships Text / TextInput as plain function components (ref is a normal prop), so the old trick of
 * overriding `Text.render` no longer exists. Instead the `Text` and `TextInput` exports of the `react-native` module are
 * swapped for thin wrappers - every `import { Text } from 'react-native'` (our screens AND libraries such as
 * React Navigation) then gets the translated version. The wrappers render the original component with JSX, so
 * NativeWind's `className` handling keeps working.
 */

type Child = unknown;
const isPrimitive = (c: Child) => c == null || typeof c === 'boolean' || typeof c === 'string' || typeof c === 'number';

function translateChildren(children: Child): Child {
  if (typeof children === 'string') return tr(children);
  if (Array.isArray(children)) {
    // `Hello {name} 👋` arrives as ["Hello ", name, " 👋"] - translate it as ONE sentence so the grammar survives
    if (children.every(isPrimitive)) {
      const sentence = children.filter((c) => c != null && typeof c !== 'boolean').join('');
      return children.some((c) => typeof c === 'string') ? tr(sentence) : children;
    }
    // mixed with nested elements: translate the plain strings, nested <Text> translate themselves
    return children.map((c) => (typeof c === 'string' ? tr(c) : c));
  }
  return children;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN = require('react-native');
const g = globalThis as any;
// keep the real components on globalThis so a Fast Refresh of this file never wraps the wrapper again
const OriginalText = (g.__wonpetOriginalText ??= RN.Text);
const OriginalTextInput = (g.__wonpetOriginalTextInput ??= RN.TextInput);

const TranslatedText = React.forwardRef<any, any>(function TranslatedText(props, ref) {
  useSyncExternalStore(subscribe, getVersion); // re-render when a batch of translations lands or the language changes
  const { noTranslate, children, ...rest } = props;
  const out = noTranslate || getLanguageCode() === 'en' ? children : translateChildren(children);
  return <OriginalText ref={ref} {...rest}>{out}</OriginalText>;
});
TranslatedText.displayName = 'Text';

const TranslatedTextInput = React.forwardRef<any, any>(function TranslatedTextInput(props, ref) {
  useSyncExternalStore(subscribe, getVersion);
  const placeholder = getLanguageCode() !== 'en' && typeof props.placeholder === 'string' ? tr(props.placeholder) : props.placeholder;
  return <OriginalTextInput ref={ref} {...props} placeholder={placeholder} />;
});
TranslatedTextInput.displayName = 'TextInput';
Object.assign(TranslatedTextInput, OriginalTextInput); // keeps statics such as TextInput.State

const swap = (name: string, component: unknown) =>
  Object.defineProperty(RN, name, { configurable: true, enumerable: true, get: () => component });
swap('Text', TranslatedText);
swap('TextInput', TranslatedTextInput);