/**
 * 🌐 API CONFIGURATION (SRS 4.5/4.6)
 * Centralized API base URL management.
 * Fallback to 10.243.180.46 for physical device testing if .env isn't loaded correctly
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://treenitiofficial1.onrender.com/api'; 
// const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.6:5000/api';

export default BASE_URL;