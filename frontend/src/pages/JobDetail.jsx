/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	getParsingJobById,
	deleteParsingJob,
	startParsingJob,
	analyzeJobAi,
	generateJobCard,
	createParsingJob,
} from '../api/parsingJobs';
import AnalysisParamsSection from '../components/AnalysisParamsSection';
import FeedbackCard from '../components/FeedbackCard';
import FeedbackModal from '../components/FeedbackModal';
import StatsSection from '../components/StatsSection';
import { STATUS_ICON_MAP } from '../constants/statusIcons';
import MarkdownView from '../components/MarkdownView';

export default function JobDetail() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [job, setJob] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [linksCollapsed, setLinksCollapsed] = useState(true);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalIndex, setModalIndex] = useState(0);

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [starting, setStarting] = useState(false);
	const [startError, setStartError] = useState(null);

	const [aiLoading, setAiLoading] = useState(false);
	const [aiError, setAiError] = useState(null);

	const [cardLoading, setCardLoading] = useState(false);
	const [cardError, setCardError] = useState(null);

	const [copyLoading, setCopyLoading] = useState(false);
	const [copyError, setCopyError] = useState(null);

	async function loadJob() {
		setLoading(true);
		setError(null);
		try {
			const res = await getParsingJobById(id);
			setJob(res.data);
			setLoading(false);
		} catch {
			setError('Не удалось загрузить анализ');
			setLoading(false);
		}
	}

	useEffect(() => {
		loadJob();
	}, [id]);

	function openModalAt(i) {
		setModalIndex(i);
		setModalOpen(true);
	}
	function closeModal() {
		setModalOpen(false);
	}
	function prevFeedback() {
		setModalIndex(
			(i) =>
				(i - 1 + (job?.feedbacks?.length || 1)) % (job?.feedbacks?.length || 1),
		);
	}
	function nextFeedback(forceIndex) {
		if (typeof forceIndex === 'number') {
			setModalIndex(forceIndex);
		} else {
			setModalIndex((i) => (i + 1) % (job?.feedbacks?.length || 1));
		}
	}

	async function handleDelete() {
		if (!confirmDelete) {
			setConfirmDelete(true);
			return;
		}
		setDeleting(true);
		const res = await deleteParsingJob(id);
		setDeleting(false);

		if (res.ok) {
			navigate('/jobs', { state: { toast: 'Анализ удалён' } });
		} else {
			alert('Не удалось удалить');
		}
	}

	async function handleStart() {
		if (!job) return;
		setStarting(true);
		setStartError(null);

		const res = await startParsingJob(job.id);
		setStarting(false);

		if (!res.ok) {
			setStartError(res.error || 'Не удалось запустить парсинг');
			return;
		}

		await loadJob();
	}

	async function handleAiAnalyze() {
		if (!job) return;
		setAiLoading(true);
		setAiError(null);
		const res = await analyzeJobAi(job.id);
		setAiLoading(false);
		if (!res.ok) {
			const msg =
				typeof res.error === 'string'
					? res.error
					: res.error?.message || JSON.stringify(res.error);
			setAiError(msg);
			return;
		}
		await loadJob();
	}

	async function handleGenerateCard() {
		if (!job) return;
		setCardLoading(true);
		setCardError(null);
		const res = await generateJobCard(job.id);
		setCardLoading(false);
		if (!res.ok) {
			const msg =
				typeof res.error === 'string'
					? res.error
					: res.error?.message || JSON.stringify(res.error);
			setCardError(msg);
			return;
		}
		await loadJob();
	}

	async function handleCopy() {
		if (!job) return;
		setCopyLoading(true);
		setCopyError(null);

		const dto = {
			name: (job.name || `Анализ #${job.id}`) + ' (копия)',
			description: job.description || null,
			searchType: job.searchType,
			searchInput: job.searchType === 'by_text' ? job.searchInput || '' : null,
			itemsLimit:
				job.searchType === 'by_text' ? (job.itemsLimit ?? null) : null,
			itemsSortType:
				job.searchType === 'by_text' ? (job.itemsSortType ?? null) : null,
			links:
				job.searchType === 'by_links'
					? Array.isArray(job.links)
						? job.links
						: []
					: null,
			feedbacksPerItemLimit: job.feedbacksPerItemLimit ?? null,
			feedbacksSortType: job.feedbacksSortType ?? null,
			creatorId: 1,
			projectId: 1,
			website: job.website || 'wildberries',
		};

		try {
			const res = await createParsingJob(dto);
			setCopyLoading(false);

			if (!res.ok) {
				const msg =
					typeof res.error === 'string'
						? res.error
						: res.error?.message || JSON.stringify(res.error);
				setCopyError(msg || 'Не удалось создать копию');
				return;
			}

			const newId = res.id || res.data?.id;
			navigate(`/jobs/${newId}`, { state: { toast: 'Создана копия анализа' } });
		} catch (e) {
			setCopyLoading(false);
			setCopyError(e?.message || 'Не удалось создать копию');
		}
	}

	if (loading) {
		return <div className="text-gray-500 px-8 py-12">Загрузка...</div>;
	}
	if (!job) {
		return (
			<div className="text-red-500 px-8 py-12">
				Ошибка: {error || 'нет данных'}
			</div>
		);
	}

	const statusIcon = STATUS_ICON_MAP[job.status] || STATUS_ICON_MAP.init;

	const statReport = job.statisticalReports?.length
		? job.statisticalReports[job.statisticalReports.length - 1]
		: null;
	const aiReport = job.aiReports?.length
		? job.aiReports[job.aiReports.length - 1]
		: null;
	const card = job.cards?.length ? job.cards[job.cards.length - 1] : null;

	return (
		<div className="max-w-6xl mx-auto">
			<section className="bg-white rounded-md shadow-subtle border border-gray-200 p-6 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
				<div className="flex-1">
					<h1 className="text-3xl font-extrabold text-gray-900 mb-4">
						{job.name || `Анализ #${job.id}`}
					</h1>

					{job.description && (
						<p className="text-sm text-gray-700 mb-6 max-w-xl">
							{job.description}
						</p>
					)}

					<div className="flex flex-wrap items-center gap-3">
						{job.status === 'init' && (
							<button
								type="button"
								onClick={() => navigate(`/jobs/${id}/edit`)}
								className="bg-primary text-white rounded-[7px]
                    flex items-center justify-center
                    h-[44px] px-5 text-sm font-medium
                    hover:shadow-md active:translate-y-[1px]
                    ">
								Редактировать
							</button>
						)}

						<button
							type="button"
							onClick={handleCopy}
							disabled={copyLoading}
							className="border border-primary text-primary bg-white rounded-[7px] h-[44px] px-5 text-sm font-medium hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none">
							{copyLoading ? 'Создаю копию...' : 'Создать копию'}
						</button>

						<button
							type="button"
							onClick={handleDelete}
							className="
                border border-gray-800 text-gray-800 bg-white
                rounded-[7px] h-[44px] px-5 text-sm font-medium
              ">
							{confirmDelete
								? deleting
									? 'Удаляю...'
									: 'Нажмите ещё раз для удаления'
								: 'Удалить'}
						</button>

						{job.status === 'init' && (
							<button
								type="button"
								onClick={handleStart}
								disabled={starting}
								className={`
                  border border-primary text-white bg-primary
                  rounded-[7px] h-[44px] px-5 text-sm font-medium
                  hover:shadow-md active:translate-y-[1px]
                  disabled:opacity-50 disabled:pointer-events-none
                `}>
								{starting ? 'Запускаю...' : 'Запустить'}
							</button>
						)}

						{startError && (
							<div className="text-xs text-red-500">{startError}</div>
						)}
						{copyError && (
							<div className="text-xs text-red-500">Копия: {copyError}</div>
						)}
					</div>
				</div>

				<div className="flex-shrink-0 flex md:flex-col items-start gap-3">
					<div className="w-12 h-12 flex items-center justify-center">
						<img
							src={statusIcon}
							alt={job.status || 'status'}
							className="w-12 h-12"
						/>
					</div>
				</div>
			</section>

			<AnalysisParamsSection
				job={job}
				linksCollapsed={linksCollapsed}
				onToggleLinks={() => setLinksCollapsed(!linksCollapsed)}
			/>

			{job.feedbacks && job.feedbacks.length > 0 && (
				<section className="mt-12">
					<h2 className="text-xl font-semibold mb-6">
						Результаты сбора отзывов
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
						{job.feedbacks.slice(0, 6).map((fb, i) => (
							<FeedbackCard
								key={i}
								feedback={fb}
								onClick={() => openModalAt(i)}
							/>
						))}
					</div>

					<div className="flex justify-center">
						<button
							type="button"
							className="
                border border-gray-800 bg-white rounded-md
                h-[44px] px-5 text-sm font-medium
              "
							onClick={() => openModalAt(0)}>
							Смотреть ещё
						</button>
					</div>
				</section>
			)}

			{statReport && <StatsSection report={statReport} />}

			<section className="mt-12">
				<h2 className="text-xl font-semibold mb-6">
					AI-анализ и карточка товара
				</h2>

				<div className="flex flex-wrap gap-3 items-center">
					<button
						type="button"
						onClick={handleAiAnalyze}
						disabled={aiLoading || !job.feedbacks || job.feedbacks.length === 0}
						className="bg-primary text-white rounded-[7px] h-[44px] px-5 text-sm font-medium hover:shadow-md active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none">
						{aiLoading ? 'Анализирую...' : 'Запустить AI-анализ'}
					</button>

					<button
						type="button"
						onClick={handleGenerateCard}
						disabled={
							cardLoading || !job.feedbacks || job.feedbacks.length === 0
						}
						className="border border-primary text-primary bg-white rounded-[7px] h-[44px] px-5 text-sm font-medium hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none">
						{cardLoading ? 'Генерирую...' : 'Сгенерировать карточку'}
					</button>

					{aiError && <div className="text-xs text-red-500">AI: {aiError}</div>}
					{cardError && (
						<div className="text-xs text-red-500">Карточка: {cardError}</div>
					)}
				</div>

				<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="bg-white rounded-md shadow-subtle border border-gray-200 p-5">
						<div className="text-sm font-semibold mb-3">Последний AI-отчёт</div>
						{aiReport ? (
							<div className="text-sm text-gray-800">
								<MarkdownView text={aiReport.aiAnswer} />
							</div>
						) : (
							<div className="text-sm text-gray-500">Пока нет AI-отчёта</div>
						)}
					</div>

					<div className="bg-white rounded-md shadow-subtle border border-gray-200 p-5">
						<div className="text-sm font-semibold mb-3">
							Последняя карточка товара
						</div>
						{card ? (
							<div className="text-sm text-gray-800">
								<MarkdownView text={card.text} />
							</div>
						) : (
							<div className="text-sm text-gray-500">
								Пока нет карточки товара
							</div>
						)}
					</div>
				</div>
			</section>

			{modalOpen && (
				<FeedbackModal
					feedbacks={job.feedbacks}
					index={modalIndex}
					onClose={closeModal}
					onPrev={prevFeedback}
					onNext={nextFeedback}
				/>
			)}
		</div>
	);
}
