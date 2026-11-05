import { useSyncExternalStore } from 'react';
import { Text, TextInput } from 'react-native';
import { getLanguageCode, getVersion, subscribe, tr } from './translator';

/**
 * Makes every <Text> and TextInput placeholder in the app translatable without touching any screen.
 * Import this ONCE at the top of App.tsx (before anything renders). Opt a piece of text out with <Text noTranslate>.
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

const originalText = (Text as any).render;
(Text as any).render = function TranslatedText(props: any, ref: any) {
  useSyncExternalStore(subscribe, getVersion); // re-render when a batch of translations lands or the language changes
  if (props.noTranslate) {
    const { noTranslate, ...rest } = props;
    return originalText(rest, ref);
  }
  if (getLanguageCode() === 'en') return originalText(props, ref);
  return originalText({ ...props, children: translateChildren(props.children) }, ref);
};

const originalInput = (TextInput as any).render;
(TextInput as any).render = function TranslatedTextInput(props: any, ref: any) {
  useSyncExternalStore(subscribe, getVersion);
  if (getLanguageCode() === 'en' || typeof props.placeholder !== 'string') return originalInput(props, ref);
  return originalInput({ ...props, placeholder: tr(props.placeholder) }, ref);
};