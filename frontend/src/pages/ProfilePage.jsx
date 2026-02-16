import { useAuth } from '../auth/auth.jsx';

export default function ProfilePage() {
	const auth = useAuth();

	if (!auth?.ready) {
		return <div>Загрузка...</div>;
	}

	if (!auth?.authenticated) {
		return (
			<div className="max-w-xl">
				<h1 className="text-2xl font-semibold mb-4">Профиль</h1>
				<p className="text-gray-700 mb-4">
					Чтобы открыть профиль, нужно войти в систему.
				</p>
				<button
					onClick={() => auth?.login?.()}
					className="border border-primary text-primary rounded-md px-4 py-2 text-sm">
					Войти
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-semibold mb-4">Профиль</h1>

			<div className="border rounded-lg p-4 bg-white">
				<div className="text-gray-700 mb-3">
					Авторизация работает через Keycloak.
				</div>

				<a
					href={auth.accountUrl()}
					target="_blank"
					rel="noreferrer"
					className="inline-block border border-primary text-primary rounded-md px-4 py-2 text-sm">
					Открыть настройки аккаунта (логин/пароль)
				</a>
			</div>
		</div>
	);
}
