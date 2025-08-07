// Serviços para operações de usuário
import api from '../lib/api';

export const userService = {
  // Login do usuário
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erro de conexão' };
    }
  },

  // Registro de novo usuário
  async register(name, email, password) {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erro de conexão' };
    }
  },

  // Obter todos os usuários (admin)
  async getAllUsers() {
    try {
      const response = await api.get('/auth/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Erro de conexão' };
    }
  },

  // Verificar se o token é válido
  async validateToken() {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Token inválido' };
    }
  }
};
