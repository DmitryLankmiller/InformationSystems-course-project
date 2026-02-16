import clsx from 'clsx';

export default function AnalysisParamsSection({
	job,
	linksCollapsed,
	onToggleLinks,
}) {
	const {
		searchType,
		feedbacksPerItemLimit,
		feedbacksSortType,
		searchInput,
		itemsLimit,
		itemsSortType,
		links,
	} = job;

	const readableSearchType =
		searchType === 'by_text'
			? 'текстовый запрос'
			: searchType === 'by_links'
				? 'ссылки'
				: searchType;

	const readableSort = (val) => {
		switch (val) {
			case 'date_asc':
				return 'по дате ↑';
			case 'date_desc':
				return 'по дате ↓';
			case 'rating_asc':
				return 'по рейтингу ↑';
			case 'rating_desc':
				return 'по рейтингу ↓';
			default:
				return val;
		}
	};

	const limitItemsText = itemsLimit != null ? String(itemsLimit) : 'нет';

	const limitFeedbacksText =
		feedbacksPerItemLimit != null ? String(feedbacksPerItemLimit) : 'нет';

	const longQuery = searchInput && searchInput.length > 80;

	const baseCard =
		'bg-white rounded-md shadow-subtle border border-gray-200 p-4 text-sm flex flex-col justify-start';

	return (
		<section className="mt-10">
			<h2 className="text-xl font-bold mb-4">Параметры анализа</h2>

			<div className="text-[15px] leading-[23px] font-semibold text-[#131313] mb-4">
				Тип поиска: {readableSearchType}
			</div>

			<div className="flex flex-col gap-4 mb-8">
				{searchInput && (
					<>
						{longQuery ? (
							<div className={clsx(baseCard, 'w-full max-w-full')}>
								<div className="text-gray-500 text-xs mb-1">Запрос:</div>
								<div className="text-gray-900 text-sm break-words leading-relaxed">
									{searchInput}
								</div>
							</div>
						) : (
							<div className="flex flex-wrap gap-4">
								<div className={clsx(baseCard, 'min-w-[250px]')}>
									<div className="text-gray-500 text-xs mb-1">Запрос:</div>
									<div className="text-gray-900 text-sm break-words leading-relaxed">
										{searchInput}
									</div>
								</div>

								<ParamMiniCard
									label="Ограничение на число объявлений:"
									value={limitItemsText}
								/>
								<ParamMiniCard
									label="Ограничение на число отзывов в объявлении:"
									value={limitFeedbacksText}
								/>
								{itemsSortType && (
									<ParamMiniCard
										label="Сортировка объявлений:"
										value={readableSort(itemsSortType)}
									/>
								)}
								<ParamMiniCard
									label="Сортировка отзывов:"
									value={readableSort(feedbacksSortType)}
								/>
							</div>
						)}

						{longQuery && (
							<div className="flex flex-wrap gap-4">
								<ParamMiniCard
									label="Ограничение на число объявлений:"
									value={limitItemsText}
								/>
								<ParamMiniCard
									label="Ограничение на число отзывов в объявлении:"
									value={limitFeedbacksText}
								/>
								{itemsSortType && (
									<ParamMiniCard
										label="Сортировка объявлений:"
										value={readableSort(itemsSortType)}
									/>
								)}
								<ParamMiniCard
									label="Сортировка отзывов:"
									value={readableSort(feedbacksSortType)}
								/>
							</div>
						)}
					</>
				)}

				{!searchInput && (
					<div className="flex flex-wrap gap-4">
						<ParamMiniCard
							label="Ограничение на число отзывов в объявлении:"
							value={limitFeedbacksText}
						/>
						<ParamMiniCard
							label="Сортировка отзывов:"
							value={readableSort(feedbacksSortType)}
						/>
					</div>
				)}
			</div>

			{Array.isArray(links) && links.length > 0 && (
				<div className="mb-12">
					<div className="text-sm font-medium mb-2 text-gray-800">Ссылки</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{(linksCollapsed ? links.slice(0, 6) : links).map((url, idx) => (
							<div
								key={idx}
								className="bg-white rounded-md shadow-subtle border border-gray-200 p-3 text-sm flex">
								<div className="text-gray-800 break-words leading-snug text-[13px]">
									{url}
								</div>
							</div>
						))}
					</div>

					{links.length > 6 && (
						<button
							type="button"
							className="flex items-center gap-1 text-sm text-gray-700 mt-3"
							onClick={onToggleLinks}>
							<span>{linksCollapsed ? 'Смотреть все' : 'Скрыть'}</span>
							<span className="text-lg leading-none">
								{linksCollapsed ? '▼' : '▲'}
							</span>
						</button>
					)}
				</div>
			)}
		</section>
	);
}

function ParamMiniCard({ label, value }) {
	return (
		<div className="bg-white rounded-md shadow-subtle border border-gray-200 p-4 text-sm min-w-[250px] max-w-[300px]">
			<div className="text-gray-500 text-xs mb-1">{label}</div>
			<div className="text-gray-900 text-sm leading-relaxed break-words">
				{value}
			</div>
		</div>
	);
}
