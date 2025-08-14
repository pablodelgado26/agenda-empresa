// Serviços para operações de clientes
import api from '../lib/api';

// Função para comprimir imagem
const compressImage = (file, maxWidth = 700, maxHeight = 500, quality = 0.6) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para base64 comprimido
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.src = file;
  });
};

// Função para comprimir array de imagens
const compressImageArray = async (imageArray) => {
  if (!imageArray || imageArray.length === 0) return [];
  
  const compressedImages = [];
  for (const image of imageArray) {
    try {
      // Primeira compressão com qualidade boa
      let compressed = await compressImage(image, 700, 500, 0.6);
      
      // Se ainda estiver muito grande, comprimir moderadamente
      if (compressed.length > 300000) { // ~300KB por imagem
        compressed = await compressImage(image, 500, 350, 0.5);
      }
      
      // Se ainda estiver muito grande, comprimir mais
      if (compressed.length > 200000) { // ~200KB por imagem
        compressed = await compressImage(image, 400, 300, 0.4);
      }
      
      compressedImages.push(compressed);
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      // Se falhar, tentar com compressão moderada
      try {
        const fallback = await compressImage(image, 400, 300, 0.4);
        compressedImages.push(fallback);
      } catch {
        // Se ainda falhar, pular a imagem
        console.warn('Imagem pulada devido a erro de compressão');
      }
    }
  }
  
  return compressedImages;
};

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
      // Comprimir imagens antes de enviar
      const compressedFotoAntes = await compressImageArray(clientData.fotoAntes);
      const compressedFotoDepois = await compressImageArray(clientData.fotoDepois);
      
      // Verificar tamanho total das imagens (estimativa em caracteres base64)
      const totalImageSize = [...compressedFotoAntes, ...compressedFotoDepois]
        .reduce((total, image) => total + (image?.length || 0), 0);
      
      console.log(`Tamanho total das imagens: ${Math.round(totalImageSize / 1024)} KB`);
      console.log(`Número de fotos: ${compressedFotoAntes.length + compressedFotoDepois.length}`);
      
      // Permitir até 3MB total para 6 fotos (3 antes + 3 depois)
      if (totalImageSize > 3000000) { // ~3MB total
        throw { error: 'Total de imagens muito grande. Tente usar no máximo 6 fotos ou fotos menores.' };
      }
      
      const clientPayload = {
        name: clientData.nome || 'Cliente',
        email: clientData.email || 'nao.informado@email.com',
        endereco: clientData.endereco || 'Endereço não informado',
        dataNascimento: clientData.aniversario || '1990-01-01',
        CPF: clientData.cpf || '000.000.000-00',
        proximoAgendamento: clientData.nextAppointment ? clientData.nextAppointment : null,
        descricao: clientData.descricao || 'Descrição não informada',
        fotoAntes: compressedFotoAntes || [],
        fotoDepois: compressedFotoDepois || []
      };
      
      console.log('Dados que serão enviados:', clientPayload);
      
      const response = await api.post('/clients', clientPayload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      console.error('Resposta do servidor:', error.response?.data);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      
      // Se foi erro 413, mostrar mensagem específica
      if (error.response?.status === 413) {
        throw { error: 'Imagens muito grandes. Tente usar menos fotos ou reduza o tamanho das imagens.' };
      }
      
      // Se foi erro 400, mostrar detalhes do servidor
      if (error.response?.status === 400) {
        const serverMessage = error.response?.data?.message || error.response?.data?.error || 'Dados inválidos';
        throw { error: `Erro de validação: ${serverMessage}` };
      }
      
      throw error.response?.data || { error: 'Erro ao criar cliente' };
    }
  },

    // Atualizar um cliente
  async updateClient(id, clientData) {
    try {
      // Comprimir imagens antes de enviar
      const compressedFotoAntes = await compressImageArray(clientData.fotoAntes);
      const compressedFotoDepois = await compressImageArray(clientData.fotoDepois);
      
      // Verificar tamanho total das imagens (estimativa em caracteres base64)
      const totalImageSize = [...compressedFotoAntes, ...compressedFotoDepois]
        .reduce((total, image) => total + (image?.length || 0), 0);
      
      console.log(`Tamanho total das imagens: ${Math.round(totalImageSize / 1024)} KB`);
      console.log(`Número de fotos: ${compressedFotoAntes.length + compressedFotoDepois.length}`);
      
      // Permitir até 3MB total para 6 fotos (3 antes + 3 depois)
      if (totalImageSize > 3000000) { // ~3MB total
        throw { error: 'Total de imagens muito grande. Tente usar no máximo 6 fotos ou fotos menores.' };
      }
      
      const response = await api.put(`/clients/${id}`, {
        name: clientData.nome || 'Cliente',
        email: clientData.email || 'nao.informado@email.com',
        endereco: clientData.endereco || 'Endereço não informado',
        dataNascimento: clientData.aniversario || '1990-01-01',
        CPF: clientData.cpf || '000.000.000-00',
        proximoAgendamento: clientData.nextAppointment || null,
        descricao: clientData.descricao || 'Descrição não informada',
        fotoAntes: compressedFotoAntes,
        fotoDepois: compressedFotoDepois
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      
      // Se foi erro 413, mostrar mensagem específica
      if (error.response?.status === 413) {
        throw { error: 'Imagens muito grandes. Tente usar menos fotos ou reduza o tamanho das imagens.' };
      }
      
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
