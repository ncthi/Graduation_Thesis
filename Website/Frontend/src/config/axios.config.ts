// src/api.ts
import axios from "axios";

const axiosRequest = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosRequest;
