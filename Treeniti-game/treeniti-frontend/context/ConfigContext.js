import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../config/api';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPublicConfig = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${BASE_URL}/auth/config/public`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.config);
            }
        } catch (e) {
            console.log('Error fetching public config:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublicConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ config, loading, refreshConfig: fetchPublicConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => useContext(ConfigContext);
