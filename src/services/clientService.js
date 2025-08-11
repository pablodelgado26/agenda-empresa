// Serviços para operações de clientes
import api from '../lib/api';

export const clientService = {
  // Buscar todos os clientes com filtros e paginação
  async getAllClients(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.name) params.append('name', filters.name);
      if (filters.email) params.append('email', filters.email);
      if (filters.cpf) params.append('cpf', filters.cpf);
      if (filters.pagina) params.append('pagina', filters.pagina);
      if (filters.limite) params.append('limite', filters.limite);
      
      const response = await api.get(`/clients?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Buscar cliente por ID
  async getClientById(id) {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Criar um novo cliente
  async createClient(clientData) {
    try {
      const response = await api.post('/clients', {
        name: clientData.nome,
        email: clientData.email,
        endereco: clientData.endereco,
        dataNascimento: clientData.aniversario,
        CPF: clientData.cpf,
        proximoAgendamento: clientData.nextAppointment,
        descricao: clientData.descricao,
        fotoAntes: clientData.fotoAntes || [], // Array de fotos
        fotoDepois: clientData.fotoDepois || [] // Array de fotos
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error.response?.data || { error: 'Erro ao criar cliente' };
    }
  },

  // Atualizar um cliente
  async updateClient(id, clientData) {
    try {
      const response = await api.put(`/clients/${id}`, {
        name: clientData.nome,
        email: clientData.email,
        endereco: clientData.endereco,
        dataNascimento: clientData.aniversario,
        CPF: clientData.cpf,
        proximoAgendamento: clientData.nextAppointment,
        descricao: clientData.descricao,
        fotoAntes: clientData.fotoAntes || [], // Array de fotos
        fotoDepois: clientData.fotoDepois || [] // Array de fotos
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error.response?.data || { error: 'Erro ao atualizar cliente' };
    }
  },

  // Deletar cliente
  async deleteClient(id) {
    try {
      const response = await api.delete(`/clients/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Buscar clientes com agendamentos próximos (para notificações)
  async getUpcomingAppointments(days = 5) {
    try {
      const response = await api.get('/clients');
      const clients = response.data.clientes || [];
      
      const hoje = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(hoje.getDate() + days);
      
      return clients.filter(client => {
        if (!client.proximoAgendamento) return false;
        
        const dataAgendamento = new Date(client.proximoAgendamento);
        return dataAgendamento >= hoje && dataAgendamento <= dataLimite;
      });
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};
