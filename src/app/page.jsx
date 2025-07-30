'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ptBR from 'date-fns/locale/pt-BR';

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
  });
  const [selectedClient, setSelectedClient] = useState(null);

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEvent = () => {
    if (!formData.nome || !selectedDate) return;

    const newEvent = {
      title: formData.nome,
      start: selectedDate,
      end: selectedDate,
      desc: formData.descricao,
      endereco: formData.endereco,
      email: formData.email,
      aniversario: formData.aniversario,
      cpf: formData.cpf,
      nextAppointment: nextAppointment || null,
    };

    setEvents((prev) => [...prev, newEvent]);
    setFormData({
      nome: '',
      descricao: '',
      endereco: '',
      email: '',
      aniversario: '',
      cpf: '',
      nextAppointment: '',
    });
    setModalMode('view');
  };

  const eventsForSelectedDate = events.filter(
    (e) => e.start.toDateString() === selectedDate?.toDateString()
  );

  const uniqueClients = Object.values(
    events.reduce((acc, curr) => {
      if (!acc[curr.title]) acc[curr.title] = curr;
      return acc;
    }, {})
  );

  return (
    <main className="p-6">
      {/* Menu de navegação simples */}
      <nav className="mb-6 flex gap-4 justify-center">
        <button
          onClick={() => setView('agenda')}
          className={`px-4 py-2 rounded ${view === 'agenda' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Agenda
        </button>
        <button
          onClick={() => setView('clientes')}
          className={`px-4 py-2 rounded ${view === 'clientes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Meus Clientes
        </button>
      </nav>

      {/* View da Agenda */}
      {view === 'agenda' && (
        <Calendar
          localizer={localizer}
          selectable
          events={events}
          views={['month']}
          defaultView="month"
          startAccessor="start"
          endAccessor="end"
          style={{ height: '80vh' }}
          onSelectSlot={handleSelectSlot}
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

      {/* View dos Clientes */}
      {view === 'clientes' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-2">Meus Clientes</h2>
          {uniqueClients.map((client, idx) => (
            <div
              key={idx}
              className="border p-4 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => setSelectedClient(client)}
            >
              <p className="font-semibold">{client.title}</p>
              <p className="text-sm text-gray-500">{client.email}</p>
            </div>
          ))}

          {/* Modal de detalhes do cliente */}
          {selectedClient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
                <h3 className="text-xl font-bold mb-4">Detalhes do Cliente</h3>
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

                <p><strong>Último serviço:</strong> {selectedClient.desc}</p>

                <button
                  onClick={() => setSelectedClient(null)}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal da Agenda */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-xl">
            <h2 className="text-2xl font-semibold mb-4">
              {modalMode === 'view'
                ? `Registros para ${selectedDate?.toLocaleDateString('pt-BR')}`
                : 'Novo Registro'}
            </h2>

            {modalMode === 'view' ? (
              <div className="space-y-2">
                {eventsForSelectedDate.length > 0 ? (
                  eventsForSelectedDate.map((event, idx) => (
                    <div key={idx} className="border p-3 rounded bg-gray-100">
                      <p><strong>Cliente:</strong> {event.title}</p>
                      <p><strong>Descrição:</strong> {event.desc || 'Sem descrição'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Nenhum registro para este dia.</p>
                )}

                <button
                  onClick={() => setModalMode('create')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Fazer novo registro
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <input
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Nome do Cliente"
                />
                <input
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Endereço"
                />
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  type="email"
                  className="w-full p-2 border rounded"
                  placeholder="E-mail"
                />
                <input
                  name="aniversario"
                  value={formData.aniversario}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full p-2 border rounded"
                  placeholder="Data de Aniversário"
                />
                <input
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="CPF"
                />
                <label className="block mb-2">
                  Próximo agendamento:
                  <input
                    type="date"
                    value={nextAppointment}
                    onChange={(e) => setNextAppointment(e.target.value)}
                    className="mt-1 p-2 border rounded w-full"
                  />
                </label>

                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Descrição do serviço"
                ></textarea>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleSaveEvent}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('view')}
                    className="text-gray-600 underline"
                  >
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
                });
              }}
              className="mt-6 text-red-500 hover:underline block"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Page;
