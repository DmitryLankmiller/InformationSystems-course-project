export default function StatsSection({ report }) {
	if (!report) return null;

	const { feedbacksCount, starsCount, feedbackStatesCount, top5Words } = report;

	const topWordsRaw = top5Words || {};
	const topWords = [
		{ word: topWordsRaw.word1, count: topWordsRaw.word1Count },
		{ word: topWordsRaw.word2, count: topWordsRaw.word2Count },
		{ word: topWordsRaw.word3, count: topWordsRaw.word3Count },
		{ word: topWordsRaw.word4, count: topWordsRaw.word4Count },
		{ word: topWordsRaw.word5, count: topWordsRaw.word5Count },
	].filter((w) => w.word);

	const maxWordCount = topWords.reduce((m, w) => Math.max(m, w.count || 0), 1);

	const starsRaw = starsCount || {};
	const starsData = [
		{ stars: 5, count: starsRaw.star5Count },
		{ stars: 4, count: starsRaw.star4Count },
		{ stars: 3, count: starsRaw.star3Count },
		{ stars: 2, count: starsRaw.star2Count },
		{ stars: 1, count: starsRaw.star1Count },
	];
	const maxStarCount = starsData.reduce((m, s) => Math.max(m, s.count || 0), 1);

	const statesRaw = feedbackStatesCount || {};
	const purchasedCount = statesRaw.purchasedCount || 0;
	const returnedCount = statesRaw.returnedCount || 0;
	const canceledCount = statesRaw.canceledCount || 0;

	const total = feedbacksCount || 1;
	const purchasedPct = Math.round((purchasedCount / total) * 100);
	const returnedPct = Math.round((returnedCount / total) * 100);
	const canceledPct = Math.round((canceledCount / total) * 100);

	const statusRows = [
		{
			label: 'Выкупили',
			count: purchasedCount,
			pct: purchasedPct,
			color: '#0314C6',
		},
		{
			label: 'Вернули',
			count: returnedCount,
			pct: returnedPct,
			color: '#ADDB2F',
		},
		{
			label: 'Отказались',
			count: canceledCount,
			pct: canceledPct,
			color: '#9CA3AF',
		},
	];

	const maxStatusCount = statusRows.reduce(
		(m, row) => Math.max(m, row.count || 0),
		1,
	);

	return (
		<section className="mt-12 mb-16">
			<h2 className="text-xl font-semibold mb-6">Отчёт по анализу</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
				<Card>
					<h3 className="text-sm font-medium mb-4">
						Наиболее часто встречающиеся слова
					</h3>

					<div className="space-y-3 text-sm">
						{topWords.map((w, i) => (
							<BarRowGeneric
								key={i}
								leftLabel={<span className="text-gray-800">{w.word}</span>}
								rightLabel={
									<span className="text-gray-800 font-medium">{w.count}</span>
								}
								value={w.count}
								max={maxWordCount}
								barColor="#0314C6"
							/>
						))}
					</div>
				</Card>

				<Card>
					<h3 className="text-sm font-medium mb-4">Статусы отзывов</h3>

					<div className="space-y-3 text-sm">
						{statusRows.map((row, i) => (
							<BarRowGeneric
								key={i}
								leftLabel={
									<div className="flex items-start gap-2">
										<span
											className="inline-block w-3 h-3 rounded-sm flex-shrink-0 mt-[4px]"
											style={{ backgroundColor: row.color }}
										/>
										<div className="flex flex-col leading-tight">
											<span className="text-gray-800 font-semibold">
												{row.label}
											</span>
											<span className="text-gray-800 text-xs font-normal">
												{row.count} отзывов ({row.pct}%)
											</span>
										</div>
									</div>
								}
								rightLabel={null}
								value={row.count}
								max={maxStatusCount}
								barColor={row.color}
							/>
						))}
					</div>

					<div className="text-[10px] text-gray-500 mt-4">
						Всего отзывов: {feedbacksCount}
					</div>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<h3 className="text-sm font-medium mb-4">
						Распределение оценок (звёзды)
					</h3>

					<div className="space-y-3 text-sm">
						{starsData.map((row, i) => (
							<BarRowStars
								key={i}
								stars={row.stars}
								count={row.count}
								max={maxStarCount}
							/>
						))}
					</div>
				</Card>
			</div>
		</section>
	);
}

function Card({ children }) {
	return (
		<div className="bg-white rounded-md shadow-subtle border border-gray-200 p-4 flex flex-col">
			{children}
		</div>
	);
}

function BarRowGeneric({ leftLabel, rightLabel, value, max, barColor }) {
	return (
		<div>
			<div className="flex justify-between items-start">
				<div>{leftLabel}</div>
				{rightLabel && (
					<div className="text-gray-800 font-medium ml-4 whitespace-nowrap">
						{rightLabel}
					</div>
				)}
			</div>

			<div className="w-full bg-gray-200 h-[4px] rounded">
				<div
					className="h-[4px] rounded"
					style={{
						backgroundColor: barColor,
						width: `${(value / max) * 100}%`,
					}}
				/>
			</div>
		</div>
	);
}

function BarRowStars({ stars, count, max }) {
	const left = (
		<div className="flex items-center gap-1">
			<span className="text-gray-800 font-semibold text-sm leading-none">
				{stars}
			</span>
			<span
				className="font-semibold text-sm leading-none"
				style={{ color: '#ADDB2F' }}>
				★
			</span>
		</div>
	);

	const right = <span className="text-gray-800 font-medium">{count}</span>;

	return (
		<div>
			<div className="flex justify-between items-start">
				<div>{left}</div>
				<div className="ml-4 whitespace-nowrap">{right}</div>
			</div>

			<div className="w-full bg-gray-200 h-[4px] rounded">
				<div
					className="h-[4px] rounded"
					style={{
						backgroundColor: '#0314C6',
						width: `${(count / max) * 100}%`,
					}}
				/>
			</div>
		</div>
	);
}
