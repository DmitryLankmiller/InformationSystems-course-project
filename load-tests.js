import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	executor: 'shared-iterations',
	vus: 50,
	iterations: 3000,
	maxDuration: '3m',
	// vus: 100,
	// duration: '30s',
	thresholds: {
		http_req_failed: ['rate<0.01'],
		http_req_duration: ['p(95)<1200'],
	},
};

export function setup() {
	const kcUrl = (__ENV.KC_URL || 'http://localhost:8081').replace(/\/$/, '');
	const realm = __ENV.KC_REALM || 'clientspeak';
	const clientId = __ENV.KC_CLIENT_ID || 'frontend';
	const username = __ENV.KC_USERNAME;
	const password = __ENV.KC_PASSWORD;

	if (!username || !password) {
		throw new Error('Set KC_USERNAME and KC_PASSWORD env vars');
	}

	const tokenUrl = `${kcUrl}/realms/${realm}/protocol/openid-connect/token`;

	const form = {
		grant_type: 'password',
		client_id: clientId,
		username,
		password,
	};

	if (__ENV.KC_CLIENT_SECRET) {
		form.client_secret = __ENV.KC_CLIENT_SECRET;
	}

	const res = http.post(tokenUrl, form, {
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	});

	const ok = check(res, {
		'kc token 200': (r) => r.status === 200,
	});

	if (!ok) {
		throw new Error(
			`Keycloak token failed: status=${res.status} body=${res.body}`,
		);
	}

	const json = res.json();
	const token = json?.access_token;
	if (!token) throw new Error(`No access_token in response: ${res.body}`);

	return { token };
}

export default function (data) {
	const apiBase = __ENV.API_BASE_URL || 'http://localhost:8080/api';
	const headers = {
		headers: {
			Authorization: `Bearer ${data.token}`,
			'Content-Type': 'application/json',
		},
	};

	const listRes = http.get(`${apiBase}/parsing-jobs`, headers);
	check(listRes, {
		'list status 200': (r) => r.status === 200,
	});

	const dto = {
		name: `k6 job ${__VU}-${__ITER}`,
		description: 'k6 load test',
		website: 'wildberries',
		searchType: 'by_links',
		links: [
			'https://www.wildberries.ru/catalog/342632157/feedbacks?imtId=191403247&size=509714236',
		],
		searchInput: null,
		itemsLimit: null,
		itemsSortType: null,
		feedbacksPerItemLimit: 10,
		feedbacksSortType: 'rating_desc',
		creatorId: 1,
		projectId: 1,
	};

	const createRes = http.post(
		`${apiBase}/parsing-jobs`,
		JSON.stringify(dto),
		headers,
	);

	const createOk = check(createRes, {
		'create status 200/201': (r) => r.status === 200 || r.status === 201,
	});

	if (!createOk) {
		sleep(0.2);
		return;
	}

	let jobId = null;
	try {
		const body = createRes.json();
		jobId = body?.id ?? null;
	} catch {
		jobId = null;
	}

	check(createRes, { 'create response has id': () => !!jobId });

	if (!jobId) {
		sleep(0.2);
		return;
	}

	const delRes = http.del(`${apiBase}/parsing-jobs/${jobId}`, null, headers);
	check(delRes, {
		'delete status 200/204': (r) => r.status === 200 || r.status === 204,
	});

	sleep(0.2);
}
