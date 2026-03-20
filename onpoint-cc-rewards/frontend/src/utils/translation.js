

import { useCallback } from 'react';

var currentLocale = {};
const availableLocales = [
    "en-US"
];

document.addEventListener('DOMContentLoaded', async () => {  
    // Load and display shipped names  
    try {  
        // Fetch the shipped JSON file (relative path from popup.html)  
        var locale = chrome.i18n.getUILanguage();
        
        const splits = locale.split('-');
        var matchedLocale = "en-US";
        var matchStrength = 0;

        for(const availableLocale in availableLocales){
            const targetLocale = availableLocale.split('-');
            const matchableSegmentCount = Math.min(splits.length, targetLocale.length);
            let i = 0;
            for(; i < matchableSegmentCount; i++)
            {
                if(targetLocale[i] !== splits[i])
                {
                    break;
                }
            }
            if(matchStrength < i) {
                matchStrength = i;
                matchedLocale = availableLocale;
            }
        }

        const response = await fetch("./languages/" + locale + ".json");  
        if (!response.ok) throw new Error('Failed to load shipped names');  
        currentLocale = await response.json();  
    } catch (error) {  
        console.error('Error loading translation:', error);  
    }  
});

/**
 * Returns a translator function.
 * @param {object} locale the locale to find a translation in.
 * @param {string} key the key of the translation
 * @param {object?} values an object containing format values
 */
function translate(locale, key, values){
    var message = locale[key] ||= key;
    if(values)
    {
        for (const [k, v] of Object.entries(values)) {
            message = message.replace(`{${k}}`, v);
        }
    }
    return message;
}
/**
 * Returns a translator function.
 * @param {string?} prefix prefix to the translation ket
 * @param {string} key the translation key used to find a translation
 */
function combineKey(prefix, key){
    if(prefix && prefix != null)
    {
        if(key.startsWith('.')){
            key = prefix+key;
        }
    }
    return key;
}
/**
 * Returns a translator function.
 * @param {string?} prefix prefix to all translation keys
 * @return {(key: string, values: object?) => string} the translation function.
 */
export function useTranslation(prefix){
    return useCallback((s, v = {}) => translate(currentLocale, combineKey(prefix,s), v), [currentLocale]);
}