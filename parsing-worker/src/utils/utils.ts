export async function sleep(ms: number) {
	await _sleep(ms);
}

function _sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function currentTime(): string {
	const now: number = Date.now();
	return now.toString();
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	opts?: {
		attempts?: number;
		delayMs?: number;
		onError?: (err: unknown, attempt: number) => void;
	},
): Promise<T> {
	const attempts = opts?.attempts ?? 3;
	const delayMs = opts?.delayMs ?? 400;

	let lastErr: unknown = null;

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			opts?.onError?.(e, attempt);
			if (attempt < attempts) {
				await new Promise((r) => setTimeout(r, delayMs));
			}
		}
	}

	throw lastErr;
}
