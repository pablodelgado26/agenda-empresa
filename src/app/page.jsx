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

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Page = () => {
  const [view, setView] = useState('agenda');
  const [nextAppointment, setNextAppointment] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [events, setEvents] = useState([]);
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

  useEffect(() => {
    const hoje = new Date();
    const cincoDiasDepois = new Date();
    cincoDiasDepois.setDate(hoje.getDate() + 5);

    const eventosEmCincoDias = events.filter((e) => {
      const dataEvento = new Date(e.start);
      return (
        dataEvento.toDateString() === cincoDiasDepois.toDateString() &&
        e.desc === 'Próximo agendamento'
      );
    });

    if (eventosEmCincoDias.length > 0) {
      eventosEmCincoDias.forEach((evento) => {
        alert(`📅 Lembrete: o cliente ${evento.title} tem um agendamento em 5 dias!`);
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

    document.addEventListener('touchstart', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, []);

  const handleSelectSlot = ({ start }) => {
    // Pequeno delay para garantir que o toque seja registrado corretamente no mobile
    setTimeout(() => {
      setSelectedDate(start);
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

  const handleSaveEvent = () => {
    if (!formData.nome || !selectedDate) return;

    const ajustada = new Date(selectedDate);
    ajustada.setHours(12, 0, 0, 0);

    const newEvent = {
      title: formData.nome,
      start: ajustada,
      end: ajustada,
      desc: formData.descricao,
      endereco: formData.endereco,
      email: formData.email,
      aniversario: formData.aniversario,
      cpf: formData.cpf,
      fotoAntes: formData.fotoAntes,
      fotoDepois: formData.fotoDepois,
      nextAppointment: nextAppointment || null,
    };

    let agendamentoFuturo = null;

    if (nextAppointment) {
      const [ano, mes, dia] = nextAppointment.split('-').map(Number);
      const prox = new Date(ano, mes - 1, dia, 12, 0, 0); // Garantir meio-dia

      const mesmaData = prox.toDateString() === ajustada.toDateString();

      if (!mesmaData) {
        agendamentoFuturo = {
          ...newEvent,
          start: prox,
          end: prox,
          desc: 'Próximo agendamento',
        };
      }
    }

    setEvents((prev) =>
      agendamentoFuturo ? [...prev, newEvent, agendamentoFuturo] : [...prev, newEvent]
    );

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
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;
    setEvents((prev) => prev.filter((e) => e.title !== selectedClient.title));
    setSelectedClient(null);
  };

  const handleEditClient = () => {
    if (!selectedClient) return;
    setFormData({
      nome: selectedClient.title || '',
      descricao: selectedClient.desc || '',
      endereco: selectedClient.endereco || '',
      email: selectedClient.email || '',
      aniversario: selectedClient.aniversario || '',
      cpf: selectedClient.cpf || '',
      fotoAntes: selectedClient.fotoAntes || '',
      fotoDepois: selectedClient.fotoDepois || '',
      nextAppointment: selectedClient.nextAppointment || '',
    });
    setNextAppointment(selectedClient.nextAppointment || '');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleUpdateClient = () => {
    if (!selectedClient) return;
    // Atualiza todos os eventos do cliente
    setEvents((prev) =>
      prev.map((e) =>
        e.title === selectedClient.title
          ? {
              ...e,
              title: formData.nome,
              desc: formData.descricao,
              endereco: formData.endereco,
              email: formData.email,
              aniversario: formData.aniversario,
              cpf: formData.cpf,
              fotoAntes: formData.fotoAntes,
              fotoDepois: formData.fotoDepois,
              nextAppointment: nextAppointment || null,
            }
          : e
      )
    );
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

  const eventsForSelectedDate = events.filter(
    (e) => new Date(e.start).toDateString() === selectedDate?.toDateString()
  );

  const uniqueClients = Object.values(
    events.reduce((acc, curr) => {
      if (!acc[curr.title]) acc[curr.title] = curr;
      return acc;
    }, {})
  );

  return (
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
      </nav>

      {view === 'agenda' && (
        <Calendar
          localizer={localizer}
          selectable
          events={events}
          views={['month']}
          defaultView="month"
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
            previous: 'Anterior',
            next: 'Próximo',
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
          {uniqueClients.map((client, idx) => (
            <div
              key={idx}
              className={style.clientCard}
              onClick={() => setSelectedClient(client)}
            >
              <p className={style.clientName}>{client.title}</p>
              <p className={style.clientEmail}>{client.email}</p>
            </div>
          ))}
        </div>
      )}

      {selectedClient && (
        <div className={style.modalOverlay}>
          <div className={style.clientModal}>
            <h3 className={style.clientModalTitle}>Detalhes do Cliente</h3>
            <p><strong>Nome:</strong> {selectedClient.title}</p>
            <p><strong>E-mail:</strong> {selectedClient.email}</p>
            <p><strong>Endereço:</strong> {selectedClient.endereco}</p>
            <p><strong>Data de Aniversário:</strong> {selectedClient.aniversario}</p>
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
              >
                Editar
              </button>
              <button
                onClick={handleDownloadPDF}
                className={style.downloadButton}
              >
                Baixar PDF
              </button>
              <button
                onClick={handleDeleteClient}
                className={style.deleteButton}
              >
                Deletar
              </button>
              <button
                onClick={() => setSelectedClient(null)}
                className={style.closeLink}
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
                  <button type="button" onClick={handleUpdateClient} className={style.saveButton}>
                    Salvar alterações
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={style.cancelButton}>
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
                  <button type="button" onClick={handleSaveEvent} className={style.saveButton}>
                    Salvar
                  </button>
                  <button type="button" onClick={() => setModalMode('view')} className={style.cancelButton}>
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
  );
};

export default Page;
