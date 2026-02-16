import { Routes, Route, Navigate } from 'react-router-dom';
import ParsingJobsPage from './pages/ParsingJobsPage';
import JobDetail from './pages/JobDetail';
import Header from './components/Header';
import Footer from './components/Footer';
import CreateParsingJob from './pages/CreateParsingJob';
import EditParsingJob from './pages/EditParsingJob';
import ProfilePage from './pages/ProfilePage.jsx';
import { useAuth } from './auth/auth.jsx';

export default function App() {
	const auth = useAuth();

	if (!auth?.ready) {
		return <div className="p-8">Загрузка...</div>;
	}

	if (!auth?.authenticated) {
		return (
			<div className="p-8">
				<div className="text-lg font-semibold mb-2">
					Редирект на Keycloak...
				</div>
				<div className="text-sm text-gray-600">
					{auth?.debug?.step}: {auth?.debug?.msg}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container mx-auto px-8 py-12">
				<Routes>
					<Route path="/" element={<Navigate to="/jobs" replace />} />
					<Route path="/jobs" element={<ParsingJobsPage />} />
					<Route path="/jobs/:id" element={<JobDetail />} />
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/create" element={<CreateParsingJob />} />
					<Route path="/jobs/:id/edit" element={<EditParsingJob />} />
					<Route path="*" element={<div>Страница не найдена</div>} />
				</Routes>
			</main>
			<Footer />
		</div>
	);
}
