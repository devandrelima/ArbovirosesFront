import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import SignIn from './pages/Authentication/Login';
import ManageUsers from './pages/Authentication/ManageUsers';
import Profile from './pages/Profile';
import DadosGerais from './pages/Dashboard/DadosGerais';
import PrevisaoDeCasos from './pages/Dashboard/PrevisaoDeCasos';
import DadosGeograficos from './pages/Dashboard/DadosGeograficos';
import DashboardBairro from './pages/Dashboard/DashboardBairro';
import CarregarLira from './pages/Lira/CarregarLira';
import DashboardLira from './pages/Lira/DashboardLira';
import DeterminantesSociais from './pages/Dashboard/DeterminantesSociais';
import GerenciarDados from './pages/Dashboard/GerenciarDados';
import UploadDeterminantes from './pages/Dashboard/UploadDeterminantes';
import WeatherData from './pages/Weather/WeatherData';

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <Routes>
      <Route
        index
        element={
          <ProtectedRoute>
            <PageTitle title="Dashboard Arboviroses" />
            <DadosGerais />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dadosGerais"
        element={
          <ProtectedRoute>
            <PageTitle title="Dashboard Arboviroses" />
            <DadosGerais />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gerenciarDados"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <PageTitle title="Gerir Notificacoes" />
            <GerenciarDados />
          </ProtectedRoute>
        }
      />
      <Route
        path="/carregarDados"
        element={<Navigate to="/gerenciarDados" replace />}
      />
      <Route
        path="/dadosMeteorologicos"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <PageTitle title="Dados meteorológicos" />
            <WeatherData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/previsaoCasos"
        element={
          <ProtectedRoute>
            <PageTitle title="Previsao de casos" />
            <PrevisaoDeCasos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/determinantesSociais"
        element={
          <ProtectedRoute>
            <PageTitle title="Determinantes sociais" />
            <DeterminantesSociais />
          </ProtectedRoute>
        }
      />
      <Route
        path="/uploadDeterminantes"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <PageTitle title="Importar Determinantes sociais" />
            <UploadDeterminantes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dadosGeograficos"
        element={
          <ProtectedRoute>
            <PageTitle title="Dados geograficos" />
            <DadosGeograficos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/bairro"
        element={
          <ProtectedRoute>
            <PageTitle title="Dados do Bairro" />
            <DashboardBairro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <PageTitle title="Meu Perfil" />
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lira/carregar"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <PageTitle title="Carregar Dados LIRA" />
            <CarregarLira />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lira/dashboard"
        element={
          <ProtectedRoute>
            <PageTitle title="Dashboard LIRA" />
            <DashboardLira />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth/login"
        element={
          <>
            <PageTitle title="Login" />
            <SignIn />
          </>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <PageTitle title="Gerenciar Usuários" />
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth/registrar"
        element={<Navigate to="/usuarios" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
