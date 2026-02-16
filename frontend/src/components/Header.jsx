import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth.jsx';

export default function Header() {
	const loc = useLocation();
	const auth = useAuth();

	const linkClass = (path) =>
		`px-4 py-3 text-sm ${loc.pathname === path ? 'text-primary font-medium' : 'text-gray-700'}`;

	return (
		<header className="w-full border-b bg-white sticky top-0 z-20">
			<div className="container mx-auto px-8 py-4 flex items-center justify-between">
				<div className="flex items-center gap-8">
					<div className="text-xl font-semibold">Клиент говорит</div>
					<nav className="hidden md:flex items-center gap-1">
						<Link className={linkClass('/jobs')} to="/jobs">
							Список анализов
						</Link>

						<Link className={linkClass('/profile')} to="/profile">
							Профиль
						</Link>
					</nav>
				</div>

				<div className="flex items-center gap-3">
					{!auth?.authenticated ? (
						<button
							onClick={() => auth?.login?.()}
							className="border border-primary text-primary rounded-md px-4 py-2 text-sm">
							Войти
						</button>
					) : (
						<button
							onClick={() => auth?.logout?.()}
							className="border border-primary text-primary rounded-md px-4 py-2 text-sm">
							Выйти
						</button>
					)}
				</div>
			</div>
		</header>
	);
}
