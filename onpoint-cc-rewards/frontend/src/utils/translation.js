

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

function translate(translation, key){
    return translation[key] ||= key;
}
/**
 * Returns a translator function.
 * @return {(key: string) => string} author - The author of the book.
 */
export function useTranslation(){
    return useCallback((s) => translate(translation, s), [translation]);
}