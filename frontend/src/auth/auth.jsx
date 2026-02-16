/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import Keycloak from 'keycloak-js';

const AuthContext = createContext(null);

function createKeycloak() {
	const url = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081';
	const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'clientspeak';
	const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend';

	return new Keycloak({
		url,
		realm,
		clientId,
	});
}

export function AuthProvider({ children }) {
	const [kc] = useState(() => createKeycloak());
	const [ready, setReady] = useState(false);
	const [authenticated, setAuthenticated] = useState(false);
	const [debug, setDebug] = useState({ step: 'init', msg: '' });
	const didInit = useRef(false);

	useEffect(() => {
		if (didInit.current) return;
		didInit.current = true;

		let timer = null;

		setDebug({ step: 'init', msg: 'kc.init()...' });

		kc.init({
			onLoad: 'login-required',
			checkLoginIframe: false,
			flow: 'implicit',
			responseMode: 'fragment',
			redirectUri: window.location.origin + '/',
		})
			.then((auth) => {
				setAuthenticated(Boolean(auth));
				setReady(true);

				window.__AUTH__ = { token: kc.token || null };
				setDebug({
					step: 'inited',
					msg: `authenticated=${String(Boolean(auth))}, token=${kc.token ? 'yes' : 'no'}`,
				});

				timer = window.setInterval(() => {
					if (!kc.authenticated) return;

					kc.updateToken(60)
						.then(() => {
							window.__AUTH__ = { token: kc.token || null };
						})
						.catch(() => {});
				}, 10000);
			})
			.catch((e) => {
				setAuthenticated(false);
				setReady(true);
				window.__AUTH__ = { token: null };
				setDebug({
					step: 'catch',
					msg: String(e?.message || e || 'init failed'),
				});
			});

		return () => {
			if (timer) window.clearInterval(timer);
		};
	}, [kc]);

	const value = useMemo(() => {
		const v = {
			ready,
			authenticated,
			keycloak: kc,
			login: () => kc.login({ redirectUri: window.location.origin + '/' }),
			logout: () => kc.logout({ redirectUri: window.location.origin + '/' }),
			token: kc.token || null,
			accountUrl: () => {
				const base =
					import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081';
				const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'clientspeak';
				return `${base}/realms/${realm}/account/`;
			},
			debug,
		};

		window.__AUTH__ = { token: v.token };
		return v;
	}, [ready, authenticated, kc, debug]);

	if (!ready) {
		return <div className="p-8">Загрузка...</div>;
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	return useContext(AuthContext);
}

export async function fetchWithAuth(url, options = {}, auth) {
	const headers = new Headers(options.headers || {});
	headers.set(
		'Content-Type',
		headers.get('Content-Type') || 'application/json',
	);

	const token = auth?.token;
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	return fetch(url, { ...options, headers });
}
