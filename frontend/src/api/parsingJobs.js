const API_BASE =
	import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function getToken() {
	return window.__AUTH__?.token || null;
}

async function apiFetch(path, options = {}) {
	const headers = new Headers(options.headers || {});

	const token = getToken();
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	if (options.body && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers,
	});

	const text = await res.text().catch(() => '');
	let body = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = text;
	}

	if (res.status === 204) {
		return { ok: true, status: res.status, data: null };
	}

	if (!res.ok) {
		return {
			ok: false,
			status: res.status,
			error: body || `HTTP ${res.status}`,
		};
	}

	return { ok: true, status: res.status, data: body };
}

export function fetchParsingJobs() {
	return apiFetch('/parsing-jobs', { method: 'GET' });
}

export function createParsingJob(dto) {
	return apiFetch('/parsing-jobs', {
		method: 'POST',
		body: JSON.stringify(dto),
	}).then((res) => {
		if (res.ok) {
			const id = res.data?.id;
			return { ...res, id };
		}
		return res;
	});
}

export function updateParsingJob(id, dto) {
	return apiFetch(`/parsing-jobs/${id}`, {
		method: 'PUT',
		body: JSON.stringify(dto),
	}).then((res) => {
		if (res.ok) {
			const newId = res.data?.id ?? Number(id);
			return { ...res, id: newId };
		}
		return res;
	});
}

export function getParsingJobById(id) {
	return apiFetch(`/parsing-jobs/${id}`, { method: 'GET' });
}

export function deleteParsingJob(id) {
	return apiFetch(`/parsing-jobs/${id}`, { method: 'DELETE' });
}

export function startParsingJob(id) {
	return apiFetch(`/parsing-jobs/${id}/start`, { method: 'POST' });
}

export function analyzeJobAi(id) {
	return apiFetch(`/parsing-jobs/${id}/ai/analyze`, { method: 'POST' });
}

export function generateJobCard(id) {
	return apiFetch(`/parsing-jobs/${id}/ai/card`, { method: 'POST' });
}
