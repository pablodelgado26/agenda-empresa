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
const EMAILJS_TEMPLATE_ID = 'template_ny3weod'; // Substitua pelo seu Template ID
const EMAILJS_PUBLIC_KEY = 'cu1qq5jEzvnY76lkm'; // Substitua pela sua Public Key

// Email da empresa
const EMAIL_EMPRESA = 'pablo.j.abreu@aluno.senai.br'; // Substitua pelo email da empresa

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
    fotoAntes: '',
    fotoDepois: '',
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(''); // 'antes' ou 'depois'
  const [stream, setStream] = useState(null);

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
      alert('Erro ao carregar clientes. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar email de lembrete
  const enviarEmailLembrete = async (cliente, diasRestantes) => {
    const dataAgendamento = new Date(cliente.nextAppointment).toLocaleDateString('pt-BR');
    
    const templateParams = {
      nome_cliente: cliente.title,
      email_cliente: cliente.email || 'Não informado',
      email_empresa: EMAIL_EMPRESA,
      data_agendamento: dataAgendamento,
      dias_restantes: diasRestantes,
      endereco_cliente: cliente.endereco || 'Não informado',
      cpf_cliente: cliente.cpf || 'Não informado',
      descricao_servico: cliente.desc || 'Serviço não especificado'
    };

    try {
      // Enviar email para o cliente (só se tiver email)
      if (cliente.email && cliente.email.trim() !== '') {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            ...templateParams,
            to_email: cliente.email,
            tipo_destinatario: 'cliente'
          }
        );
        console.log('✅ Email enviado para o cliente:', cliente.email);
      }

      // Enviar email para a empresa
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          ...templateParams,
          to_email: EMAIL_EMPRESA,
          tipo_destinatario: 'empresa'
        }
      );
      console.log('✅ Email enviado para a empresa:', EMAIL_EMPRESA);
      
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
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
        nextAppointment: nextAppointment || null
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
        fotoAntes: '',
        fotoDepois: '',
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
      fotoAntes: selectedClient.fotoAntes || '',
      fotoDepois: selectedClient.fotoDepois || '',
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
        nextAppointment: nextAppointment || null
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
        fotoAntes: '',
        fotoDepois: '',
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
    if (selectedClient.fotoAntes || selectedClient.fotoDepois) {
      doc.setFontSize(14);
      doc.text('Fotos:', 20, yPosition);
      yPosition += 10;
      
      const photoWidth = 70;
      const photoHeight = 70;
      let xPosition = 20;
      
      // Foto Antes
      if (selectedClient.fotoAntes) {
        doc.setFontSize(12);
        doc.text('Antes:', xPosition, yPosition);
        try {
          doc.addImage(selectedClient.fotoAntes, 'JPEG', xPosition, yPosition + 5, photoWidth, photoHeight);
        } catch (error) {
          console.warn('Erro ao adicionar foto "Antes" ao PDF:', error);
          doc.text('Erro ao carregar foto', xPosition, yPosition + 35);
        }
        xPosition += photoWidth + 20;
      }
      
      // Foto Depois
      if (selectedClient.fotoDepois) {
        doc.setFontSize(12);
        doc.text('Depois:', xPosition, yPosition);
        try {
          doc.addImage(selectedClient.fotoDepois, 'JPEG', xPosition, yPosition + 5, photoWidth, photoHeight);
        } catch (error) {
          console.warn('Erro ao adicionar foto "Depois" ao PDF:', error);
          doc.text('Erro ao carregar foto', xPosition, yPosition + 35);
        }
      }
      
      yPosition += photoHeight + 20;
    }
    
    // Data de geração do relatório
    doc.setFontSize(10);
    doc.text(`Relatório gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, yPosition);
    
    // Download do PDF
    doc.save(`cliente_${selectedClient.title.replace(/\s+/g, '_')}.pdf`);
  };

  const openCamera = async (mode) => {
    setCameraMode(mode);
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
      setIsCameraOpen(false);
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
      setFormData(prev => ({ ...prev, fotoAntes: photoData }));
    } else if (cameraMode === 'depois') {
      setFormData(prev => ({ ...prev, fotoDepois: photoData }));
    }
    
    closeCamera();
  };

  const removePhoto = (type) => {
    if (type === 'antes') {
      setFormData(prev => ({ ...prev, fotoAntes: '' }));
    } else if (type === 'depois') {
      setFormData(prev => ({ ...prev, fotoDepois: '' }));
    }
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
      )}

      {view === 'clientes' && (
        <div className={style.clientsContainer}>
          <h2 className={style.clientsTitle}>Meus Clientes</h2>
          {loading ? (
            <div className={style.loadingMessage}>Carregando clientes...</div>
          ) : uniqueClients.length > 0 ? (
            uniqueClients.map((client, idx) => (
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
            ))
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
            
            {(selectedClient.fotoAntes || selectedClient.fotoDepois) && (
              <div className={style.photosSection}>
                <h4><strong>Fotos:</strong></h4>
                <div className={style.photosContainer}>
                  {selectedClient.fotoAntes && (
                    <div className={style.photoItem}>
                      <p className={style.photoLabel}>Antes:</p>
                      <img src={selectedClient.fotoAntes} alt="Foto Antes" className={style.photo} />
                    </div>
                  )}
                  {selectedClient.fotoDepois && (
                    <div className={style.photoItem}>
                      <p className={style.photoLabel}>Depois:</p>
                      <img src={selectedClient.fotoDepois} alt="Foto Depois" className={style.photo} />
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
                      <label>Foto Antes:</label>
                      {formData.fotoAntes ? (
                        <div className={style.photoPreview}>
                          <img src={formData.fotoAntes} alt="Antes" className={style.photoThumbnail} />
                          <button type="button" onClick={() => removePhoto('antes')} className={style.removePhotoButton}>
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openCamera('antes')} className={style.cameraButton}>
                          📷 Tirar Foto Antes
                        </button>
                      )}
                    </div>
                    <div className={style.photoColumn}>
                      <label>Foto Depois:</label>
                      {formData.fotoDepois ? (
                        <div className={style.photoPreview}>
                          <img src={formData.fotoDepois} alt="Depois" className={style.photoThumbnail} />
                          <button type="button" onClick={() => removePhoto('depois')} className={style.removePhotoButton}>
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openCamera('depois')} className={style.cameraButton}>
                          📷 Tirar Foto Depois
                        </button>
                      )}
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
                      <label>Foto Antes:</label>
                      {formData.fotoAntes ? (
                        <div className={style.photoPreview}>
                          <img src={formData.fotoAntes} alt="Antes" className={style.photoThumbnail} />
                          <button type="button" onClick={() => removePhoto('antes')} className={style.removePhotoButton}>
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openCamera('antes')} className={style.cameraButton}>
                          📷 Tirar Foto Antes
                        </button>
                      )}
                    </div>
                    <div className={style.photoColumn}>
                      <label>Foto Depois:</label>
                      {formData.fotoDepois ? (
                        <div className={style.photoPreview}>
                          <img src={formData.fotoDepois} alt="Depois" className={style.photoThumbnail} />
                          <button type="button" onClick={() => removePhoto('depois')} className={style.removePhotoButton}>
                            Remover
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openCamera('depois')} className={style.cameraButton}>
                          📷 Tirar Foto Depois
                        </button>
                      )}
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
                  fotoAntes: '',
                  fotoDepois: '',
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
