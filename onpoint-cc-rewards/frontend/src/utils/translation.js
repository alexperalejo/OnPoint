

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

function translate(translation, key, values){
    var message = translation[key] ||= key;
    if(values)
    {
        for (const [k, v] of values.entries()) {
            message = message.replace(`{${k}}`, v);
        }
    }
    return message;
}
/**
 * Returns a translator function.
 * @param {string?} prefix prefix to all translation keys
 * @return {(key: string, values: object?) => string} translation function.
 */
export function useTranslation(prefix){
    if(prefix && prefix !== ""){
        prefix = prefix + ".";
        return useCallback((s, v = {}) => translate(prefix+translation, s, v), [translation]);
    } else{
        return useCallback((s, v = {}) => translate(translation, s, v), [translation]);
    }
}