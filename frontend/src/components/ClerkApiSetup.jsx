// Attaches Clerk session JWT to API requests for backend requireAuth()
import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import api from "../utils/api";

export default function ClerkApiSetup() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const id = api.interceptors.request.use(async (config) => {
      if (!isLoaded || !isSignedIn) return config;
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => api.interceptors.request.eject(id);
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
