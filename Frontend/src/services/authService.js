import api from "./api";

export const authService = {
  register: async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },

  login: async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    return data;
  },

  me: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  },

  logout: async () => {
    const { data } = await api.post("/auth/logout");
    return data;
  },
};
