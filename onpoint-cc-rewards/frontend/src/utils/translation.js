

import { useCallback } from 'react';

var translation = {};

document.addEventListener('DOMContentLoaded', async () => {  
    // Load and display shipped names  
    try {  
        // Fetch the shipped JSON file (relative path from popup.html)  
        var language = chrome.i18n.getUILanguage();
        console.log(language);
        const response = await fetch("./languages/"+ language + ".json");  
        if (!response.ok) throw new Error('Failed to load shipped names');  
        translation = await response.json();  
    } catch (error) {  
        console.error('Error loading translation:', error);  
    }  
});

/**
 * Returns a translator function.
 * @param {object} translation the locale
 * @param {string} key the key
 * @param {object?} values value fill
 */
function translate(translation, key, values){
    var message = translation[key] ||= key;
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
 * @param {string?} prefix prefix to all translation keys
 * @param {string} key prefix to all translation keys
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
 * @return {(key: string, values: object?) => string} translation function.
 */
export function useTranslation(prefix){
    return useCallback((s, v = {}) => translate(translation, combineKey(prefix,s), v), [translation]);
}