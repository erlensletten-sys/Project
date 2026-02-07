import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { nb } from './nb';

const translations = { en, nb };

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first, then browser preference
    const saved = localStorage.getItem('nordicforge_language');
    if (saved && (saved === 'en' || saved === 'nb')) {
      return saved;
    }
    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('nb') || browserLang.startsWith('no') || browserLang.startsWith('nn')) {
      return 'nb';
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('nordicforge_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations['en'];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return the key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  // Template function for translations with variables
  const tVar = (key, vars = {}) => {
    let text = t(key);
    Object.entries(vars).forEach(([varKey, varValue]) => {
      text = text.replace(`{${varKey}}`, varValue);
    });
    return text;
  };

  const changeLanguage = (lang) => {
    if (lang === 'en' || lang === 'nb') {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, tVar, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { en, nb };
