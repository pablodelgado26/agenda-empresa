'use client';

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import style from './page.module.css';
import ptBR from 'date-fns/locale/pt-BR';
import jsPDF from 'jspdf';
import emailjs from '@emailjs/browser';
import { ProtectedRoute, useAuth } from '../context/AuthContext';
import { clientService } from '../services/clientService';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Configuração do EmailJS - SUBSTITUA PELOS SEUS IDs
const EMAILJS_SERVICE_ID = 'service_flukyy6'; // Substitua pelo seu Service ID
const EMAILJS_TEMPLATE_ID_CLIENT = 'template_ny3weod'; // Template para CLIENTE
const EMAILJS_TEMPLATE_ID_COMPANY = 'template_ny3weod'; // Template para EMPRESA (mesmo por enquanto)
const EMAILJS_PUBLIC_KEY = 'cu1qq5jEzvnY76lkm'; // Substitua pela sua Public Key

// Email da empresa
const EMAIL_EMPRESA = 'srfriomanutencao@gmail.com'; // Substitua pelo email da empresa

const Page = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState('agenda');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nextAppointment, setNextAppointment] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    endereco: '',
    email: '',
    aniversario: '',
    cpf: '',
    nextAppointment: '',
    fotoAntes: [], // Array de fotos
    fotoDepois: [], // Array de fotos
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(''); // 'antes' ou 'depois'
  const [stream, setStream] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Inicializar EmailJS
  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    loadClients();
  }, []);

  // Carregar clientes da API
  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getAllClients({ limite: 100 });
      const clientsData = response.clientes || [];
      
      setClients(clientsData);
      
      // Converter clientes para eventos do calendário
      const clientEvents = [];
      
      clientsData.forEach(client => {
        // Evento principal (data de criação com horário fixo)
        const createdDate = client.createdAt ? new Date(client.createdAt) : new Date();
        createdDate.setHours(12, 0, 0, 0); // Forçar meio-dia para evitar problemas de fuso
        
        const mainEvent = {
          id: client.id,
          title: client.name,
          start: createdDate,
          end: createdDate,
          desc: client.descricao || 'Cliente cadastrado',
          endereco: client.endereco,
          email: client.email,
          aniversario: client.dataNascimento,
          cpf: client.CPF,
          fotoAntes: client.fotoAntes,
          fotoDepois: client.fotoDepois,
          nextAppointment: client.proximoAgendamento,
          clientData: client
        };
        
        clientEvents.push(mainEvent);
        
        // Adicionar próximo agendamento se existir
        if (client.proximoAgendamento) {
          const appointmentDate = new Date(client.proximoAgendamento);
          appointmentDate.setHours(12, 0, 0, 0); // Forçar meio-dia
          
          const appointmentEvent = {
            ...mainEvent,
            start: appointmentDate,
            end: appointmentDate,
            desc: 'Próximo agendamento'
          };
          clientEvents.push(appointmentEvent);
        }
      });
      
      setEvents(clientEvents);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar email de lembrete
  const enviarEmailLembrete = async (cliente, diasRestantes) => {
    const dataAgendamento = new Date(cliente.nextAppointment).toLocaleDateString('pt-BR');
    
    try {
      // Email para o cliente (mensagem amigável)
      if (cliente.email && cliente.email.trim() !== '' && cliente.email.includes('@')) {
        console.log('📧 Enviando email para cliente:', cliente.email);
        
        const clientParams = {
          to_name: cliente.title || 'Cliente',
          to_email: cliente.email,
          from_name: 'Agenda Sr. Frio',
          client_name: cliente.title || 'Cliente',
          appointment_date: dataAgendamento,
          days_remaining: diasRestantes.toString(),
          client_address: cliente.endereco || 'Não informado',
          service_description: cliente.desc || 'Serviço agendado',
          company_email: EMAIL_EMPRESA,
          message_type: 'cliente'
        };

        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID_CLIENT,
          clientParams
        );
        console.log('✅ Email enviado para o cliente:', cliente.email);
      } else {
        console.log('⚠️ Cliente sem email válido, enviando apenas para empresa');
      }

      // Aguardar 2 segundos entre envios
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Email para a empresa (informações completas)
      console.log('📧 Enviando email para empresa:', EMAIL_EMPRESA);
      
      const companyParams = {
        to_name: 'Equipe Sr. Frio',
        to_email: EMAIL_EMPRESA,
        from_name: 'Sistema Agenda Sr. Frio',
        client_name: cliente.title || 'Cliente',
        appointment_date: dataAgendamento,
        days_remaining: diasRestantes.toString(),
        client_address: cliente.endereco || 'Não informado',
        client_cpf: cliente.cpf || 'Não informado',
        client_email: cliente.email || 'Não informado',
        service_description: cliente.desc || 'Serviço agendado',
        company_email: EMAIL_EMPRESA,
        message_type: 'empresa'
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID_COMPANY,
        companyParams
      );
      console.log('✅ Email enviado para a empresa:', EMAIL_EMPRESA);
      
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      console.error('Detalhes do erro:', error.text || error.message);
      
      // Mostrar alerta apenas se for erro crítico
      if (error.text && !error.text.includes('rate limit')) {
        alert(`Erro ao enviar email: ${error.text}`);
      }
    }
  };

  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0); // Normalizar horário
    
    const cincoDiasDepois = new Date(hoje);
    cincoDiasDepois.setDate(hoje.getDate() + 5);

    const eventosEmCincoDias = events.filter((e) => {
      const dataEvento = new Date(e.start);
      dataEvento.setHours(12, 0, 0, 0); // Normalizar horário
      
      return (
        dataEvento.getFullYear() === cincoDiasDepois.getFullYear() &&
        dataEvento.getMonth() === cincoDiasDepois.getMonth() &&
        dataEvento.getDate() === cincoDiasDepois.getDate() &&
        e.desc === 'Próximo agendamento'
      );
    });

    if (eventosEmCincoDias.length > 0) {
      eventosEmCincoDias.forEach(async (evento) => {
        // Mostrar alerta
        alert(`📅 Lembrete: o cliente ${evento.title} tem um agendamento em 5 dias!`);
        
        // Enviar email de lembrete
        try {
          await enviarEmailLembrete(evento, 5);
        } catch (error) {
          console.error('Falha ao enviar email de lembrete:', error);
        }
      });
    }
  }, [events]);

  // Melhora a experiência de toque no mobile
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventDoubleTapZoom = (e) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('dblclick', preventDoubleTapZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('dblclick', preventDoubleTapZoom);
    };
  }, []);

  const handleSelectSlot = ({ start }) => {
    // Corrigir fuso horário - garantir que a data selecionada seja exata
    const adjustedDate = new Date(start);
    adjustedDate.setHours(12, 0, 0, 0); // Forçar meio-dia para evitar problemas de fuso
    
    // Pequeno delay para garantir que o toque seja registrado corretamente no mobile
    setTimeout(() => {
      setSelectedDate(adjustedDate);
      setModalMode('view');
      setIsModalOpen(true);
    }, 50);
  };

  const formatCPF = (value) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    // Aplica a máscara
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData((prev) => ({ ...prev, cpf: formatCPF(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEvent = async () => {
    if (!formData.nome || !selectedDate) return;

    try {
      setLoading(true);
      
      // Corrigir problema de fuso horário - forçar horário local
      const adjustedDate = new Date(selectedDate);
      adjustedDate.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de fuso
      
      // Corrigir o nextAppointment para evitar problema de fuso horário
      let nextAppointmentFormatted = null;
      if (nextAppointment) {
        // Se temos uma data, criar uma nova data em horário local
        const [year, month, day] = nextAppointment.split('-');
        const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0);
        nextAppointmentFormatted = appointmentDate.toISOString();
      }
      
      // Criar cliente na API
      const response = await clientService.createClient({
        nome: formData.nome,
        email: formData.email,
        endereco: formData.endereco,
        aniversario: formData.aniversario,
        cpf: formData.cpf,
        descricao: formData.descricao,
        fotoAntes: formData.fotoAntes,
        fotoDepois: formData.fotoDepois,
        nextAppointment: nextAppointmentFormatted
      });

      console.log('Cliente criado:', response);
      
      // Recarregar lista de clientes
      await loadClients();
      
      // Limpar formulário
      setFormData({
        nome: '',
        descricao: '',
        endereco: '',
        email: '',
        aniversario: '',
        cpf: '',
        fotoAntes: [],
        fotoDepois: [],
        nextAppointment: '',
      });
      setNextAppointment('');
      setModalMode('view');
      setIsModalOpen(false);
      
      alert('Cliente cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente: ' + (error.error || 'Verifique os dados e tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient || !selectedClient.clientData?.id) return;

    if (!confirm('Tem certeza que deseja deletar este cliente?')) return;

    try {
      setLoading(true);
      
      await clientService.deleteClient(selectedClient.clientData.id);
      
      // Recarregar lista de clientes
      await loadClients();
      
      setSelectedClient(null);
      alert('Cliente deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      alert('Erro ao deletar cliente: ' + (error.error || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = () => {
    if (!selectedClient) return;
    
    const clientData = selectedClient.clientData || selectedClient;
    
    setFormData({
      nome: selectedClient.title || '',
      descricao: selectedClient.desc || '',
      endereco: selectedClient.endereco || '',
      email: selectedClient.email || '',
      aniversario: clientData.dataNascimento ? clientData.dataNascimento.split('T')[0] : '',
      cpf: selectedClient.cpf || clientData.CPF || '',
      fotoAntes: Array.isArray(selectedClient.fotoAntes) ? selectedClient.fotoAntes : [],
      fotoDepois: Array.isArray(selectedClient.fotoDepois) ? selectedClient.fotoDepois : [],
      nextAppointment: selectedClient.nextAppointment || '',
    });
    setNextAppointment(clientData.proximoAgendamento ? clientData.proximoAgendamento.split('T')[0] : '');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!selectedClient || !selectedClient.clientData?.id) return;

    try {
      setLoading(true);
      
      // Corrigir o nextAppointment para evitar problema de fuso horário
      let nextAppointmentFormatted = null;
      if (nextAppointment) {
        // Se temos uma data, criar uma nova data em horário local
        const [year, month, day] = nextAppointment.split('-');
        const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0);
        nextAppointmentFormatted = appointmentDate.toISOString();
      }
      
      // Atualizar cliente na API
      const response = await clientService.updateClient(selectedClient.clientData.id, {
        nome: formData.nome,
        email: formData.email,
        endereco: formData.endereco,
        aniversario: formData.aniversario,
        cpf: formData.cpf,
        descricao: formData.descricao,
        fotoAntes: formData.fotoAntes,
        fotoDepois: formData.fotoDepois,
        nextAppointment: nextAppointmentFormatted
      });

      console.log('Cliente atualizado:', response);
      
      // Recarregar lista de clientes
      await loadClients();
      
      setSelectedClient(null);
      setIsModalOpen(false);
      setModalMode('view');
      setFormData({
        nome: '',
        descricao: '',
        endereco: '',
        email: '',
        aniversario: '',
        cpf: '',
        fotoAntes: [],
        fotoDepois: [],
        nextAppointment: '',
      });
      setNextAppointment('');
      
      alert('Cliente atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente: ' + (error.error || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedClient) return;

    const doc = new jsPDF();
    
    // Título do documento
    doc.setFontSize(20);
    doc.text('Detalhes do Cliente', 20, 20);
    
    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    // Informações do cliente
    doc.setFontSize(12);
    let yPosition = 40;
    
    doc.text(`Nome: ${selectedClient.title || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    
    doc.text(`E-mail: ${selectedClient.email || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    
    doc.text(`Endereço: ${selectedClient.endereco || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    
    doc.text(`CPF: ${selectedClient.cpf || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    
    doc.text(`Data de Aniversário: ${selectedClient.aniversario || 'Não informado'}`, 20, yPosition);
    yPosition += 10;
    
    const proximoAgendamento = selectedClient.nextAppointment 
      ? new Date(selectedClient.nextAppointment).toLocaleDateString('pt-BR')
      : 'Não informado';
    doc.text(`Próximo Agendamento: ${proximoAgendamento}`, 20, yPosition);
    yPosition += 15;
    
    // Descrição com quebra de linha
    doc.text('Descrição:', 20, yPosition);
    yPosition += 10;
    
    const descricao = selectedClient.desc || 'Nenhuma descrição disponível';
    const splitText = doc.splitTextToSize(descricao, 170);
    doc.text(splitText, 20, yPosition);
    yPosition += splitText.length * 5 + 15;
    
    // Adicionar fotos se existirem
    if ((Array.isArray(selectedClient.fotoAntes) && selectedClient.fotoAntes.length > 0) || 
        (Array.isArray(selectedClient.fotoDepois) && selectedClient.fotoDepois.length > 0)) {
      doc.setFontSize(14);
      doc.text('Fotos:', 20, yPosition);
      yPosition += 15;
      
      const photoWidth = 60;
      const photoHeight = 60;
      const photosPerRow = 2;
      let currentRow = 0;
      let currentCol = 0;
      
      // Fotos Antes
      if (Array.isArray(selectedClient.fotoAntes) && selectedClient.fotoAntes.length > 0) {
        doc.setFontSize(12);
        doc.text('Antes:', 20, yPosition);
        yPosition += 10;
        
        selectedClient.fotoAntes.forEach((foto, index) => {
          const xPosition = 20 + (currentCol * (photoWidth + 10));
          const yPos = yPosition + (currentRow * (photoHeight + 10));
          
          try {
            doc.addImage(foto, 'JPEG', xPosition, yPos, photoWidth, photoHeight);
          } catch (error) {
            console.warn(`Erro ao adicionar foto "Antes" ${index + 1} ao PDF:`, error);
            doc.text(`Erro foto ${index + 1}`, xPosition, yPos + 30);
          }
          
          currentCol++;
          if (currentCol >= photosPerRow) {
            currentCol = 0;
            currentRow++;
          }
        });
        
        yPosition += Math.ceil(selectedClient.fotoAntes.length / photosPerRow) * (photoHeight + 10) + 15;
        currentRow = 0;
        currentCol = 0;
      }
      
      // Fotos Depois
      if (Array.isArray(selectedClient.fotoDepois) && selectedClient.fotoDepois.length > 0) {
        doc.setFontSize(12);
        doc.text('Depois:', 20, yPosition);
        yPosition += 10;
        
        selectedClient.fotoDepois.forEach((foto, index) => {
          const xPosition = 20 + (currentCol * (photoWidth + 10));
          const yPos = yPosition + (currentRow * (photoHeight + 10));
          
          try {
            doc.addImage(foto, 'JPEG', xPosition, yPos, photoWidth, photoHeight);
          } catch (error) {
            console.warn(`Erro ao adicionar foto "Depois" ${index + 1} ao PDF:`, error);
            doc.text(`Erro foto ${index + 1}`, xPosition, yPos + 30);
          }
          
          currentCol++;
          if (currentCol >= photosPerRow) {
            currentCol = 0;
            currentRow++;
          }
        });
        
        yPosition += Math.ceil(selectedClient.fotoDepois.length / photosPerRow) * (photoHeight + 10) + 20;
      }
    }
    
    // Data de geração do relatório
    doc.setFontSize(10);
    doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, yPosition);
    
    // Download do PDF
    doc.save(`cliente_${selectedClient.title.replace(/\s+/g, '_')}.pdf`);
  };

  // Função para melhorar responsividade de toque em botões
  const createResponsiveHandler = (handler) => {
    return {
      onClick: handler,
      onTouchStart: (e) => {
        // Previne o delay de 300ms no mobile
        e.preventDefault();
        handler(e);
      },
      onTouchEnd: (e) => {
        e.preventDefault();
      }
    };
  };

  const openCamera = async (mode) => {
    // Verificar se estamos no ambiente do navegador
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      alert('Funcionalidade de câmera não disponível neste ambiente.');
      return;
    }

    // Verificar se há suporte básico para câmera
    const hasBasicCameraSupport = !!(
      navigator.mediaDevices?.getUserMedia ||
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia
    );

    if (!hasBasicCameraSupport) {
      // Oferecer alternativa quando câmera não está disponível
      const useFileInput = confirm(
        'Câmera não disponível neste dispositivo/navegador.\n\n' +
        'Deseja selecionar uma foto da galeria/arquivos?\n\n' +
        'Clique OK para abrir seletor de arquivos ou Cancelar para voltar.'
      );
      
      if (useFileInput) {
        handleGallerySelect(mode);
      }
      return;
    }

    setCameraMode(mode);
    setIsCameraOpen(true);
    
    try {
      let mediaStream = null;
      
      // Tentar API moderna primeiro
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          // Tentar câmera traseira primeiro
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 }
            }
          });
        } catch (backCameraError) {
          console.log('Câmera traseira não disponível, tentando frontal...');
          // Fallback para câmera frontal
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'user',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
              }
            });
            alert('Câmera traseira não disponível. Usando câmera frontal.');
          } catch (frontCameraError) {
            // Último fallback - qualquer câmera disponível
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
            alert('Usando câmera padrão disponível.');
          }
        }
      } else {
        // Fallback para navegadores antigos
        const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        mediaStream = await new Promise((resolve, reject) => {
          getUserMedia.call(navigator, 
            { video: true },
            resolve,
            reject
          );
        });
      }
      
      if (mediaStream) {
        setStream(mediaStream);
      } else {
        throw new Error('Não foi possível obter stream da câmera');
      }
      
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      setIsCameraOpen(false);
      setCameraMode('');
      
      // Oferecer alternativa quando há erro
      const useFileInput = confirm(
        'Não foi possível acessar a câmera.\n\n' +
        'Possíveis causas:\n' +
        '• Permissões não concedidas\n' +
        '• Câmera em uso por outro app\n' +
        '• Navegador não suporta HTTPS\n\n' +
        'Deseja selecionar uma foto da galeria/arquivos?\n\n' +
        'Clique OK para abrir seletor de arquivos ou Cancelar para voltar.'
      );
      
      if (useFileInput) {
        handleGallerySelect(mode);
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCameraMode('');
  };

  const takePhoto = () => {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    if (cameraMode === 'antes') {
      setFormData(prev => ({ 
        ...prev, 
        fotoAntes: [...prev.fotoAntes, photoData] 
      }));
    } else if (cameraMode === 'depois') {
      setFormData(prev => ({ 
        ...prev, 
        fotoDepois: [...prev.fotoDepois, photoData] 
      }));
    }
    
    closeCamera();
  };

  const removePhoto = (type, index) => {
    if (type === 'antes') {
      setFormData(prev => ({
        ...prev,
        fotoAntes: prev.fotoAntes.filter((_, i) => i !== index)
      }));
    } else if (type === 'depois') {
      setFormData(prev => ({
        ...prev,
        fotoDepois: prev.fotoDepois.filter((_, i) => i !== index)
      }));
    }
  };

  const handleGallerySelect = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = (event) => {
      const files = Array.from(event.target.files);
      
      if (files.length === 0) return;
      
      // Mostrar feedback de carregamento
      const loadingMessage = `Carregando ${files.length} foto(s)...`;
      console.log(loadingMessage);
      
      let processedCount = 0;
      const totalFiles = files.length;
      
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          // Verificar tamanho do arquivo (máximo 5MB)
          if (file.size > 5 * 1024 * 1024) {
            alert(`A imagem ${file.name} é muito grande. Máximo 5MB por foto.`);
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (e) => {
            const photoData = e.target.result;
            
            if (type === 'antes') {
              setFormData(prev => ({ 
                ...prev, 
                fotoAntes: [...prev.fotoAntes, photoData] 
              }));
            } else if (type === 'depois') {
              setFormData(prev => ({ 
                ...prev, 
                fotoDepois: [...prev.fotoDepois, photoData] 
              }));
            }
            
            processedCount++;
            if (processedCount === totalFiles) {
              console.log(`${totalFiles} foto(s) adicionada(s) com sucesso!`);
            }
          };
          
          reader.onerror = () => {
            alert(`Erro ao carregar a imagem ${file.name}`);
          };
          
          reader.readAsDataURL(file);
        } else {
          alert(`${file.name} não é um arquivo de imagem válido.`);
        }
      });
    };
    
    input.click();
  };

  const eventsForSelectedDate = events.filter((e) => {
    if (!selectedDate) return false;
    
    const eventDate = new Date(e.start);
    const selectedDateOnly = new Date(selectedDate);
    
    // Comparar apenas ano, mês e dia (ignorar horário)
    return (
      eventDate.getFullYear() === selectedDateOnly.getFullYear() &&
      eventDate.getMonth() === selectedDateOnly.getMonth() &&
      eventDate.getDate() === selectedDateOnly.getDate()
    );
  });

  // Usar diretamente a lista de clientes da API
  const uniqueClients = clients;

  // Filtrar clientes com base na pesquisa
  const filteredClients = uniqueClients.filter(client => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const nome = (client.name || '').toLowerCase();
    const email = (client.email || '').toLowerCase();
    const cpf = (client.CPF || '').replace(/\D/g, ''); // Remove formatação do CPF
    const searchCpf = searchTerm.replace(/\D/g, ''); // Remove formatação da pesquisa
    
    return nome.includes(searchLower) || 
           email.includes(searchLower) || 
           cpf.includes(searchCpf);
  });

  return (
    <ProtectedRoute>
      <main className={style.mainContainer}>
        <nav className={style.navContainer}>
          <button
            onClick={() => setView('agenda')}
            className={`${style.navButton} ${view === 'agenda' ? style.navButtonActive : style.navButtonInactive}`}
          >
            Agenda
          </button>
          <button
            onClick={() => setView('clientes')}
            className={`${style.navButton} ${view === 'clientes' ? style.navButtonActive : style.navButtonInactive}`}
          >
            Meus Clientes
          </button>
          
          <div className={style.userSection}>
            <span className={style.welcomeText}>
              Olá, {user?.name || user?.email}
            </span>
            <button
              onClick={logout}
              className={style.logoutButton}
            >
              Sair
            </button>
          </div>
        </nav>

      {view === 'agenda' && (
        <div
          className={style.calendarContainer}
          style={{ position: 'relative' }}
          onTouchStart={e => {
            // Detecta se tocou em um dia do calendário
            const target = e.target;
            let cell = null;
            if (target.classList.contains('rbc-day-bg')) {
              cell = target;
            } else if (target.classList.contains('rbc-date-cell')) {
              cell = target.querySelector('button') || target;
            } else if (target.closest('.rbc-date-cell')) {
              cell = target.closest('.rbc-date-cell').querySelector('button') || target.closest('.rbc-date-cell');
            }
            if (cell) {
              // Tenta extrair a data do atributo data-date ou aria-label
              let dateStr = cell.getAttribute('data-date') || cell.getAttribute('aria-label');
              if (!dateStr && cell.textContent) {
                // Fallback: tenta construir a data a partir do texto do botão
                const day = parseInt(cell.textContent);
                if (!isNaN(day)) {
                  const current = new Date();
                  dateStr = new Date(current.getFullYear(), current.getMonth(), day).toISOString();
                }
              }
              if (dateStr) {
                // Chama handleSelectSlot diretamente
                handleSelectSlot({ start: new Date(dateStr) });
                e.preventDefault();
                e.stopPropagation();
              }
            }
          }}
        >
          <Calendar
            localizer={localizer}
            selectable
            events={events}
            views={['month']}
            defaultView="month"
            view="month"
            date={currentDate}
            onNavigate={(date) => {
              console.log('Navegando para:', date);
              setCurrentDate(date);
            }}
            startAccessor="start"
            endAccessor="end"
            className={style.calendarContainer}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={(event) => {
              setSelectedClient(event);
              setView('agenda');
            }}
            culture="pt-BR"
            messages={{
              date: 'Data',
              time: 'Hora',
              event: 'Evento',
              allDay: 'Dia inteiro',
              week: 'Semana',
              work_week: 'Semana útil',
              day: 'Dia',
              month: 'Mês',
              previous: '❮',
              next: '❯',
              yesterday: 'Ontem',
              tomorrow: 'Amanhã',
              today: 'Hoje',
              agenda: 'Agenda',
              noEventsInRange: 'Nenhum evento neste período.',
              showMore: (total) => `+ Ver mais (${total})`,
            }}
          />
        </div>
      )}

      {view === 'clientes' && (
        <div className={style.clientsContainer}>
          <h2 className={style.clientsTitle}>Meus Clientes</h2>
          
          {/* Caixa de pesquisa */}
          <div className={style.searchContainer}>
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={style.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={style.clearSearchButton}
                title="Limpar pesquisa"
              >
                ✕
              </button>
            )}
          </div>
          
          {loading ? (
            <div className={style.loadingMessage}>Carregando clientes...</div>
          ) : filteredClients.length > 0 ? (
            <>
              {searchTerm && (
                <div className={style.searchResults}>
                  {filteredClients.length} cliente(s) encontrado(s)
                </div>
              )}
              {filteredClients.map((client, idx) => (
                <div
                  key={client.id || idx}
                  className={style.clientCard}
                  onClick={() => {
                    // Criar objeto compatível com o formato esperado
                    const clientEvent = {
                      id: client.id,
                      title: client.name,
                      desc: client.descricao,
                      endereco: client.endereco,
                      email: client.email,
                      aniversario: client.dataNascimento,
                      cpf: client.CPF,
                      fotoAntes: client.fotoAntes,
                      fotoDepois: client.fotoDepois,
                      nextAppointment: client.proximoAgendamento,
                      clientData: client
                    };
                    setSelectedClient(clientEvent);
                  }}
                >
                  <p className={style.clientName}>{client.name}</p>
                  <p className={style.clientEmail}>{client.email}</p>
                  {client.proximoAgendamento && (
                    <p className={style.clientAppointment}>
                      Próximo agendamento: {new Date(client.proximoAgendamento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : searchTerm ? (
            <div className={style.noClientsMessage}>
              Nenhum cliente encontrado para "{searchTerm}".
            </div>
          ) : (
            <div className={style.noClientsMessage}>
              Nenhum cliente cadastrado ainda.
            </div>
          )}
        </div>
      )}

      {selectedClient && (
        <div className={style.modalOverlay}>
          <div className={style.clientModal}>
            <h3 className={style.clientModalTitle}>Detalhes do Cliente</h3>
            <p><strong>Nome:</strong> {selectedClient.title}</p>
            <p><strong>E-mail:</strong> {selectedClient.email}</p>
            <p><strong>Endereço:</strong> {selectedClient.endereco}</p>
            <p><strong>Data de Aniversário:</strong> {
              selectedClient.aniversario ? 
              new Date(selectedClient.aniversario).toLocaleDateString('pt-BR') : 
              'Não informado'
            }</p>
            <p><strong>CPF:</strong> {selectedClient.cpf}</p>
            <p>
              <strong>Próximo agendamento:</strong>{' '}
              {selectedClient.nextAppointment
                ? new Date(selectedClient.nextAppointment).toLocaleDateString('pt-BR')
                : 'Não informado'}
            </p>
            <p><strong>Descrição:</strong> {selectedClient.desc}</p>
            
            {((Array.isArray(selectedClient.fotoAntes) && selectedClient.fotoAntes.length > 0) || 
              (Array.isArray(selectedClient.fotoDepois) && selectedClient.fotoDepois.length > 0)) && (
              <div className={style.photosSection}>
                <h4><strong>Fotos:</strong></h4>
                <div className={style.photosContainer}>
                  {Array.isArray(selectedClient.fotoAntes) && selectedClient.fotoAntes.length > 0 && (
                    <div className={style.photoGroup}>
                      <p className={style.photoGroupLabel}>Antes:</p>
                      <div className={style.photoGrid}>
                        {selectedClient.fotoAntes.map((foto, index) => (
                          <div key={`antes-${index}`} className={style.photoItem}>
                            <img src={foto} alt={`Foto Antes ${index + 1}`} className={style.photo} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(selectedClient.fotoDepois) && selectedClient.fotoDepois.length > 0 && (
                    <div className={style.photoGroup}>
                      <p className={style.photoGroupLabel}>Depois:</p>
                      <div className={style.photoGrid}>
                        {selectedClient.fotoDepois.map((foto, index) => (
                          <div key={`depois-${index}`} className={style.photoItem}>
                            <img src={foto} alt={`Foto Depois ${index + 1}`} className={style.photo} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className={style.clientModalButtons}>
              <button
                onClick={handleEditClient}
                className={style.editButton}
                disabled={loading}
              >
                {loading ? 'Carregando...' : 'Editar'}
              </button>
              <button
                onClick={handleDownloadPDF}
                className={style.downloadButton}
                disabled={loading}
              >
                Baixar PDF
              </button>
              <button
                onClick={handleDeleteClient}
                className={style.deleteButton}
                disabled={loading}
              >
                {loading ? 'Deletando...' : 'Deletar'}
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className={style.closeLink}
                disabled={loading}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className={style.modalOverlay}>
          <div className={style.mainModal}>
            <h2 className={style.mainModalTitle}>
              {modalMode === 'view'
                ? `Registros para ${selectedDate?.toLocaleDateString('pt-BR')}`
                : modalMode === 'edit'
                ? 'Editar Cliente'
                : 'Novo Registro'}
            </h2>
            {modalMode === 'view' ? (
              <div className={style.viewSection}>
                {eventsForSelectedDate.length > 0 ? (
                  eventsForSelectedDate.map((event, idx) => (
                    <div key={idx} className={style.eventCard}>
                      <p><strong>Cliente:</strong> {event.title}</p>
                      <p><strong>Descrição:</strong> {event.desc || 'Sem descrição'}</p>
                    </div>
                  ))
                ) : (
                  <p className={style.noEventsText}>Nenhum registro para este dia.</p>
                )}
                <button
                  onClick={() => setModalMode('create')}
                  className={style.newRecordButton}
                >
                  Fazer novo registro
                </button>
              </div>
            ) : modalMode === 'edit' ? (
              <form className={style.formContainer} onSubmit={(e) => e.preventDefault()}>
                <input name="nome" value={formData.nome} onChange={handleInputChange} className={style.formInput} placeholder="Nome do Cliente" />
                <input name="endereco" value={formData.endereco} onChange={handleInputChange} className={style.formInput} placeholder="Endereço" />
                <input name="email" value={formData.email} onChange={handleInputChange} type="email" className={style.formInput} placeholder="E-mail" />
                <label className={style.dateLabel}>
                  Data de Aniversário:
                  <input name="aniversario" value={formData.aniversario} onChange={handleInputChange} type="date" className={style.dateInput} />
                </label>
                <input name="cpf" value={formData.cpf} onChange={handleInputChange} className={style.cpfInput} placeholder="CPF" maxLength={14} inputMode="numeric" pattern="\d*" />
                <label className={style.dateLabel}>
                  Próximo agendamento:
                  <input type="date" value={nextAppointment} onChange={(e) => setNextAppointment(e.target.value)} className={style.dateInput} />
                </label>
                
                <div className={style.photosFormSection}>
                  <h4>Fotos do Cliente:</h4>
                  <div className={style.photoRow}>
                    <div className={style.photoColumn}>
                      <label>Fotos Antes:</label>
                      <div className={style.photoGallery}>
                        {formData.fotoAntes.map((foto, index) => (
                          <div key={`edit-antes-${index}`} className={style.photoPreview}>
                            <img src={foto} alt={`Antes ${index + 1}`} className={style.photoThumbnail} />
                            <button 
                              type="button" 
                              onClick={() => removePhoto('antes', index)} 
                              className={style.removePhotoButton}
                              title="Remover foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className={style.photoButtons}>
                          <button type="button" onClick={() => openCamera('antes')} className={style.cameraButton}>
                            📷 Câmera
                          </button>
                          <button type="button" onClick={() => handleGallerySelect('antes')} className={style.galleryButton}>
                            🖼️ Galeria
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={style.photoColumn}>
                      <label>Fotos Depois:</label>
                      <div className={style.photoGallery}>
                        {formData.fotoDepois.map((foto, index) => (
                          <div key={`edit-depois-${index}`} className={style.photoPreview}>
                            <img src={foto} alt={`Depois ${index + 1}`} className={style.photoThumbnail} />
                            <button 
                              type="button" 
                              onClick={() => removePhoto('depois', index)} 
                              className={style.removePhotoButton}
                              title="Remover foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className={style.photoButtons}>
                          <button type="button" onClick={() => openCamera('depois')} className={style.cameraButton}>
                            📷 Câmera
                          </button>
                          <button type="button" onClick={() => handleGallerySelect('depois')} className={style.galleryButton}>
                            🖼️ Galeria
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <textarea name="descricao" value={formData.descricao} onChange={handleInputChange} className={style.formTextarea} placeholder="Descrição do serviço" />
                <div className={style.formButtons}>
                  <button type="button" onClick={handleUpdateClient} className={style.saveButton} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={style.cancelButton} disabled={loading}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form className={style.formContainer} onSubmit={(e) => e.preventDefault()}>
                <input name="nome" value={formData.nome} onChange={handleInputChange} className={style.formInput} placeholder="Nome do Cliente" />
                <input name="endereco" value={formData.endereco} onChange={handleInputChange} className={style.formInput} placeholder="Endereço" />
                <input name="email" value={formData.email} onChange={handleInputChange} type="email" className={style.formInput} placeholder="E-mail" />
                <label className={style.dateLabel}>
                  Data de Aniversário:
                  <input name="aniversario" value={formData.aniversario} onChange={handleInputChange} type="date" className={style.dateInput} />
                </label>
                <input name="cpf" value={formData.cpf} onChange={handleInputChange} className={style.cpfInput} placeholder="CPF" maxLength={14} inputMode="numeric" pattern="\d*" />
                <label className={style.dateLabel}>
                  Próximo agendamento:
                  <input type="date" value={nextAppointment} onChange={(e) => setNextAppointment(e.target.value)} className={style.dateInput} />
                </label>
                
                <div className={style.photosFormSection}>
                  <h4>Fotos do Cliente:</h4>
                  <div className={style.photoRow}>
                    <div className={style.photoColumn}>
                      <label>Fotos Antes:</label>
                      <div className={style.photoGallery}>
                        {formData.fotoAntes.map((foto, index) => (
                          <div key={`create-antes-${index}`} className={style.photoPreview}>
                            <img src={foto} alt={`Antes ${index + 1}`} className={style.photoThumbnail} />
                            <button 
                              type="button" 
                              onClick={() => removePhoto('antes', index)} 
                              className={style.removePhotoButton}
                              title="Remover foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className={style.photoButtons}>
                          <button type="button" onClick={() => openCamera('antes')} className={style.cameraButton}>
                            📷 Câmera
                          </button>
                          <button type="button" onClick={() => handleGallerySelect('antes')} className={style.galleryButton}>
                            🖼️ Galeria
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={style.photoColumn}>
                      <label>Fotos Depois:</label>
                      <div className={style.photoGallery}>
                        {formData.fotoDepois.map((foto, index) => (
                          <div key={`create-depois-${index}`} className={style.photoPreview}>
                            <img src={foto} alt={`Depois ${index + 1}`} className={style.photoThumbnail} />
                            <button 
                              type="button" 
                              onClick={() => removePhoto('depois', index)} 
                              className={style.removePhotoButton}
                              title="Remover foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <div className={style.photoButtons}>
                          <button type="button" onClick={() => openCamera('depois')} className={style.cameraButton}>
                            📷 Câmera
                          </button>
                          <button type="button" onClick={() => handleGallerySelect('depois')} className={style.galleryButton}>
                            🖼️ Galeria
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <textarea name="descricao" value={formData.descricao} onChange={handleInputChange} className={style.formTextarea} placeholder="Descrição do serviço" />
                <div className={style.formButtons}>
                  <button type="button" onClick={handleSaveEvent} className={style.saveButton} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => setModalMode('view')} className={style.cancelButton} disabled={loading}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <button
              onClick={() => {
                setIsModalOpen(false);
                setModalMode('view');
                setFormData({
                  nome: '',
                  descricao: '',
                  endereco: '',
                  email: '',
                  aniversario: '',
                  cpf: '',
                  fotoAntes: [],
                  fotoDepois: [],
                  nextAppointment: '',
                });
                setNextAppointment('');
              }}
              className={style.closeButton}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {isCameraOpen && (
        <div className={style.modalOverlay}>
          <div className={style.cameraModal}>
            <h3 className={style.cameraTitle}>
              Tirar Foto {cameraMode === 'antes' ? 'Antes' : 'Depois'}
            </h3>
            <video 
              id="camera-video" 
              autoPlay 
              playsInline 
              className={style.cameraVideo}
              ref={(video) => {
                if (video && stream) {
                  video.srcObject = stream;
                }
              }}
            />
            <div className={style.cameraButtons}>
              <button onClick={takePhoto} className={style.captureButton}>
                📷 Capturar
              </button>
              <button onClick={closeCamera} className={style.cancelCameraButton}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </ProtectedRoute>
  );
};

export default Page;
