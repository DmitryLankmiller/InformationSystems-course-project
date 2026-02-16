const FEEDBACK_STATE_MAP = {
	purchased: 'Выкупили',
	returned: 'Вернули',
	canceled: 'Отказались',
	pinned: 'Закреплён',
};

export default function FeedbackCard({ feedback, onClick }) {
	const { starsRating, feedbackState, feedbackDate, rawJson } = feedback;

	let feedbackText = '';
	let advantages = '';
	let disadvantages = '';
	let comment = '';
	let sourceUrl = '';

	try {
		const parsed = rawJson ? JSON.parse(rawJson) : {};
		feedbackText = (parsed.feedback_text ?? '').trim();
		advantages = (parsed.advantages_text ?? '').trim();
		disadvantages = (parsed.disadvantages_text ?? '').trim();
		comment = (parsed.comment_text ?? '').trim();
		sourceUrl = (parsed.source_url ?? '').trim();
	} catch {
		/* empty */
	}

	const stateLabel = feedbackState
		? FEEDBACK_STATE_MAP[feedbackState] || feedbackState
		: '';
	const dateStr = formatDate(feedbackDate);

	const allExtrasEmpty = !advantages && !disadvantages && !comment;

	return (
		<div
			className="bg-white rounded-md shadow-subtle border border-gray-200 p-4 cursor-pointer"
			onClick={onClick}>
			<div className="flex items-start justify-between mb-3">
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

				<StarRating rating={starsRating} />
			</div>

			<div className="text-sm text-gray-800 space-y-2 leading-[23px]">
				{allExtrasEmpty ? (
					feedbackText && <div className="text-[#131313]">{feedbackText}</div>
				) : (
					<>
						{advantages && (
							<div>
								<span className="font-bold text-[#131313]">Достоинства: </span>
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

				{sourceUrl && (
					<div className="pt-1">
						<a
							href={sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-gray-500 underline"
							onClick={(e) => e.stopPropagation()}>
							Источник: товар на сайте
						</a>
					</div>
				)}
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
