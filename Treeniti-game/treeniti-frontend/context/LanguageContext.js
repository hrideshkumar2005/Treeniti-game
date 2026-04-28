import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../constants/Translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('en');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem('user-lang');
                if (savedLang) {
                    setLanguage(savedLang);
                }
            } catch (e) {
                console.log('Error loading language:', e);
            } finally {
                setLoading(false);
            }
        };
        loadLanguage();
    }, []);

    const changeLanguage = async (newLang) => {
        setLanguage(newLang);
        try {
            await AsyncStorage.setItem('user-lang', newLang);
        } catch (e) {
            console.log('Error saving language:', e);
        }
    };

    const t = translations[language] || translations['en'];

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t, loading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
