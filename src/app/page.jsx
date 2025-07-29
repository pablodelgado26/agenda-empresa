'use client';

import { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ptBR from 'date-fns/locale/pt-BR';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Page = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
    setIsModalOpen(true);
  };

  return (
    <main className="p-6">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold">Agenda da Empresa</h1>
      </header>

      <Calendar
        localizer={localizer}
        selectable
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
          showMore: (total) => `+ Ver mais (${total})`
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-xl">
            <h2 className="text-xl font-semibold mb-4">Novo Registro - {selectedDate?.toLocaleDateString('pt-BR')}</h2>

            <form className="space-y-4">
              <input className="w-full p-2 border rounded" placeholder="Nome do Cliente" />
              <input className="w-full p-2 border rounded" placeholder="Endereço" />
              <input className="w-full p-2 border rounded" placeholder="E-mail" type="email" />
              <input className="w-full p-2 border rounded" placeholder="Data de Aniversário" type="date" />
              <input className="w-full p-2 border rounded" placeholder="CPF" />
              <textarea className="w-full p-2 border rounded" placeholder="Descrição do serviço"></textarea>
              <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Salvar PDF (em breve)
              </button>
            </form>

            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 text-red-500 hover:underline"
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
