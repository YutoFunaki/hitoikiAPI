import axios from "axios";

import { API_BASE_URL } from './config/api';

export const registerUser = async (email: string, password: string) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/register`, { email, password });
        return response.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to register");
    }
};

export const loginUser = async (email: string, password: string) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
        return response.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to login");
    }
};
