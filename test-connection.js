// Teste de conexão simples com o backend
const axios = require('axios');

async function testConnection() {
  console.log('🔍 Testando conexão com o backend...');
  
  try {
    // Teste 1: Tentar registrar um usuário
    console.log('\n1️⃣ Testando registro de usuário...');
    const registerResponse = await axios.post('http://localhost:4000/auth/register', {
      name: 'Usuario Teste Frontend',
      email: 'frontend2@test.com',
      password: '123456'
    });
    console.log('✅ Registro:', registerResponse.data.message);
    
    // Teste 2: Tentar fazer login
    console.log('\n2️⃣ Testando login...');
    const loginResponse = await axios.post('http://localhost:4000/auth/login', {
      email: 'frontend2@test.com',
      password: '123456'
    });
    console.log('✅ Login:', loginResponse.data.message);
    console.log('🔑 Token recebido:', loginResponse.data.token ? 'Sim' : 'Não');
    
    // Teste 3: Testar rota protegida
    console.log('\n3️⃣ Testando rota protegida...');
    const clientsResponse = await axios.get('http://localhost:4000/clients', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    console.log('✅ Clientes carregados:', clientsResponse.data.clientes ? 'Sim' : 'Não');
    
    console.log('\n🎉 Todos os testes passaram! O backend está funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.response?.data || error.message);
  }
}

testConnection();
