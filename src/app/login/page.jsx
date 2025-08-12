'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import style from './login.module.css';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro quando o usuário começar a digitar
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await userService.login(formData.email, formData.password);

      if (response.message === 'Login realizado com sucesso!') {
        // Usar o contexto de autenticação
        login(response.userExists, response.token);
        
        // Redirecionar para a página principal
        router.push('/');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      
      if (error.error === 'Credenciais inválidas!') {
        setError('Email ou senha incorretos');
      } else if (error.error === 'Os campos email e senha são obrigatórios') {
        setError('Preencha email e senha');
      } else {
        setError('Erro interno do servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação de senha mínima
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await userService.register(
        formData.name || formData.email.split('@')[0], // Usar nome do form ou parte do email
        formData.email, 
        formData.password
      );

      if (response.message === 'Usuário criado com sucesso!') {
        // Após registro, fazer login automaticamente
        await handleLogin(e);
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      
      if (error.error === 'Este email já está em uso!') {
        setError('Email já está em uso');
      } else if (error.error === 'Os campos nome, email ou senha são obrigatórios') {
        setError('Preencha todos os campos obrigatórios');
      } else {
        setError('Erro interno do servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className={style.loginContainer} suppressHydrationWarning={true}>
      <div className={style.loginCard}>
        <div className={style.loginHeader}>
          <h1 className={style.loginTitle}>
            {isRegister ? 'Criar Conta' : 'Agenda Sr. Frio'}
          </h1>
          <p className={style.loginSubtitle}>
            {isRegister 
              ? 'Crie sua conta para começar' 
              : 'Faça login para acessar sua agenda'
            }
          </p>
        </div>

        <form 
          className={style.loginForm} 
          onSubmit={isRegister ? handleRegister : handleLogin}
          suppressHydrationWarning={true}
        >
          {isRegister && (
            <div className={style.inputGroup}>
              <label htmlFor="name" className={style.inputLabel}>
                Nome
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={style.inputField}
                placeholder="Seu nome completo"
                disabled={loading}
              />
            </div>
          )}

          <div className={style.inputGroup}>
            <label htmlFor="email" className={style.inputLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={style.inputField}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className={style.inputGroup}>
            <label htmlFor="password" className={style.inputLabel}>
              Senha
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={style.inputField}
              placeholder="Digite sua senha"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <div className={style.errorMessage}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <button
            type="submit"
            className={style.submitButton}
            disabled={loading || !formData.email || !formData.password || (isRegister && !formData.name)}
          >
            {loading ? (
              <span className={style.loadingSpinner}>⏳ Carregando...</span>
            ) : (
              <span>{isRegister ? 'Criar Conta' : 'Entrar'}</span>
            )}
          </button>
        </form>

        <div className={style.toggleSection}>
          <p className={style.toggleText}>
            {isRegister 
              ? 'Já tem uma conta?' 
              : 'Não tem uma conta?'
            }
          </p>
          <button
            type="button"
            onClick={toggleMode}
            className={style.toggleButton}
            disabled={loading}
          >
            {isRegister ? 'Fazer Login' : 'Criar Conta'}
          </button>
        </div>

        <div className={style.loginFooter}>
          <p className={style.footerText}>
            Sistema de Agenda Empresarial
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
