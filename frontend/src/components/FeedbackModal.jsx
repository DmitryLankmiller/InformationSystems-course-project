const FEEDBACK_STATE_MAP = {
	purchased: 'Выкупили',
	returned: 'Вернули',
	canceled: 'Отказались',
	pinned: 'Закреплён',
};

export default function FeedbackModal({
	feedbacks,
	index,
	onClose,
	onPrev,
	onNext,
}) {
	const f = feedbacks?.[index];
	if (!f) return null;

	let feedbackText = '';
	let advantages = '';
	let disadvantages = '';
	let comment = '';
	let sourceUrl = '';

	try {
		const parsed = f.rawJson ? JSON.parse(f.rawJson) : {};
		feedbackText = (parsed.feedback_text ?? '').trim();
		advantages = (parsed.advantages_text ?? '').trim();
		disadvantages = (parsed.disadvantages_text ?? '').trim();
		comment = (parsed.comment_text ?? '').trim();
		sourceUrl = (parsed.source_url ?? '').trim();
	} catch {
		/* empty */
	}

	const rating = f.starsRating ?? 0;
	const stateLabel = f.feedbackState
		? FEEDBACK_STATE_MAP[f.feedbackState] || f.feedbackState
		: '';
	const dateStr = formatDate(f.feedbackDate);
	const allExtrasEmpty = !advantages && !disadvantages && !comment;

	const pages = buildCompactPages(feedbacks.length, index, 7);

	return (
		<div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-4">
			<div className="bg-white rounded-md shadow-xl border border-gray-300 max-w-2xl w-full p-6 relative">
				<div className="flex items-start justify-between mb-4">
					<div className="text-sm text-gray-700">
						<div className="flex items-center gap-2 text-gray-800">
							<div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
								<img
									src="/assets/profile-circle.svg"
									alt="user"
									className="w-8 h-8"
								/>
							</div>
							<div>
								<div className="font-medium text-gray-800">Пользователь</div>
								<div className="text-xs text-gray-500">{dateStr}</div>
							</div>
						</div>

						{stateLabel && (
							<div className="mt-2">
								<span className="inline-flex items-center bg-[#F4F4F4] rounded-[7px] text-xs text-gray-800 px-4 py-2">
									{stateLabel}
								</span>
							</div>
						)}
					</div>

					<StarRating rating={rating} />
				</div>

				<div className="text-sm text-gray-800 space-y-3 max-h-[260px] overflow-y-auto border-t border-b py-4 mb-4">
					{allExtrasEmpty ? (
						feedbackText && <div className="text-[#131313]">{feedbackText}</div>
					) : (
						<>
							{advantages && (
								<div>
									<span className="font-bold text-[#131313]">
										Достоинства:{' '}
									</span>
									<span className="text-[#131313]">{advantages}</span>
								</div>
							)}
							{disadvantages && (
								<div>
									<span className="font-bold text-[#131313]">Недостатки: </span>
									<span className="text-[#131313]">{disadvantages}</span>
								</div>
							)}
							{comment && (
								<>
									<hr className="border-black/20" />
									<div>
										<span className="font-bold text-[#131313]">
											Комментарий:{' '}
										</span>
										<span className="text-[#131313]">{comment}</span>
									</div>
								</>
							)}
						</>
					)}
				</div>

				{sourceUrl && (
					<div className="mb-4">
						<a
							href={sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-gray-500 underline">
							Источник: товар на сайте
						</a>
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2 text-xs text-gray-800">
					<button
						type="button"
						onClick={onPrev}
						className="border rounded-sm px-2 py-1">
						{'<'}
					</button>

					<div className="flex gap-1 flex-wrap">
						{pages.map((p, i) =>
							p === '...' ? (
								<span
									key={`dots-${i}`}
									className="px-2 py-1 text-gray-500 select-none">
									…
								</span>
							) : (
								<button
									key={p}
									type="button"
									onClick={() => onNext(p - 1)}
									className={
										'border rounded-sm px-2 py-1 ' +
										(p - 1 === index
											? 'bg-primary text-white border-primary'
											: '')
									}>
									{p}
								</button>
							),
						)}
					</div>

					<button
						type="button"
						onClick={onNext}
						className="border rounded-sm px-2 py-1">
						{'>'}
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
					aria-label="Закрыть">
					✕
				</button>
			</div>
		</div>
	);
}

function StarRating({ rating }) {
	const stars = [1, 2, 3, 4, 5];
	return (
		<div className="flex gap-1 text-lg leading-none">
			{stars.map((i) => (
				<span
					key={i}
					className={i <= rating ? 'text-[#ADDB2F]' : 'text-gray-300'}>
					★
				</span>
			))}
		</div>
	);
}

function formatDate(dt) {
	if (!dt) return '';
	const d = new Date(dt);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const year = d.getFullYear();
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${day}.${month}.${year}, ${hh}:${mm}`;
}

function buildCompactPages(total, currentIndex, maxButtons = 7) {
	if (total <= 0) return [];
	const current = currentIndex + 1;
	const pages = [];

	if (total <= maxButtons) {
		for (let p = 1; p <= total; p++) pages.push(p);
		return pages;
	}

	const first = 1;
	const last = total;

	const windowSize = Math.max(3, maxButtons - 2);
	let left = Math.max(current - Math.floor(windowSize / 2), 2);
	let right = Math.min(left + windowSize - 1, last - 1);

	left = Math.max(2, right - windowSize + 1);

	pages.push(first);
	if (left > 2) pages.push('...');

	for (let p = left; p <= right; p++) pages.push(p);

	if (right < last - 1) pages.push('...');
	pages.push(last);

	return pages;
}
