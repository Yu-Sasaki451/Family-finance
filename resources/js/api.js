import axios from "axios";

const token = localStorage.getItem("auth_token");

if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export const setAuthToken = (newToken) => {
    if (newToken) {
        localStorage.setItem("auth_token", newToken);
        axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        return;
    }

    localStorage.removeItem("auth_token");
    delete axios.defaults.headers.common.Authorization;
};

export const getAuthToken = () => localStorage.getItem("auth_token");
