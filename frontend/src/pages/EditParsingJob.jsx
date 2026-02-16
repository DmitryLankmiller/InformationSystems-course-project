import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	createParsingJob,
	getParsingJobById,
	updateParsingJob,
} from '../api/parsingJobs';
import NumberStepper from '../components/NumberStepper';
import Checkbox from '../components/Checkbox';

const ITEM_SORT_OPTIONS = [
	{ value: 'date_asc', label: 'По дате ↑' },
	{ value: 'date_desc', label: 'По дате ↓' },
	{ value: 'rating_asc', label: 'По рейтингу ↑' },
	{ value: 'rating_desc', label: 'По рейтингу ↓' },
];
const FEEDBACK_SORT_OPTIONS = [
	{ value: 'date_asc', label: 'По дате ↑' },
	{ value: 'date_desc', label: 'По дате ↓' },
	{ value: 'rating_asc', label: 'По рейтингу ↑' },
	{ value: 'rating_desc', label: 'По рейтингу ↓' },
];

export default function EditParsingJob() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');

	const [searchType, setSearchType] = useState('by_links');

	const [searchInput, setSearchInput] = useState('');
	const [limitFeedbacksEnabled, setLimitFeedbacksEnabled] = useState(false);
	const [feedbacksPerItemLimit, setFeedbacksPerItemLimit] = useState(1);

	const [limitItemsEnabled, setLimitItemsEnabled] = useState(false);
	const [itemsLimit, setItemsLimit] = useState(3);

	const [itemsSortType, setItemsSortType] = useState(
		ITEM_SORT_OPTIONS[0].value,
	);
	const [feedbacksSortType, setFeedbacksSortType] = useState(
		FEEDBACK_SORT_OPTIONS[0].value,
	);

	const [links, setLinks] = useState([]);
	const [linkInput, setLinkInput] = useState('');
	const [showAllLinks, setShowAllLinks] = useState(false);
	const linkInputRef = useRef(null);

	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [jobStatus, setJobStatus] = useState('init');
	const [savingAsNew, setSavingAsNew] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			try {
				const res = await getParsingJobById(id);
				const job = res.data;
				if (!mounted) return;

				setJobStatus(job.status);

				setName(job.name || '');
				setDescription(job.description || '');

				setSearchType(job.searchType || 'by_links');

				setFeedbacksSortType(
					job.feedbacksSortType || FEEDBACK_SORT_OPTIONS[0].value,
				);

				setLimitFeedbacksEnabled(job.feedbacksPerItemLimit != null);
				setFeedbacksPerItemLimit(job.feedbacksPerItemLimit ?? 1);

				if (job.searchType === 'by_text') {
					setSearchInput(job.searchInput || '');
					setLimitItemsEnabled(job.itemsLimit != null);
					setItemsLimit(job.itemsLimit ?? 3);
					setItemsSortType(job.itemsSortType || ITEM_SORT_OPTIONS[0].value);
				} else {
					setLinks(Array.isArray(job.links) ? job.links : []);

					setSearchInput('');
					setLimitItemsEnabled(false);
					setItemsLimit(3);
					setItemsSortType(ITEM_SORT_OPTIONS[0].value);
				}

				setLoading(false);
			} catch {
				if (!mounted) return;
				setError('Не удалось загрузить анализ');
				setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, [id]);

	const visibleLinks = showAllLinks ? links : links.slice(0, 4);
	const readOnly = jobStatus !== 'init';

	function normalizeUrl(u) {
		let s = u.trim();
		if (!s) return '';
		if (s.endsWith('/')) s = s.slice(0, -1);
		return s;
	}

	function addLink() {
		const raw = linkInput;
		const val = normalizeUrl(raw);
		if (!val) return;

		setLinks((prev) => {
			const exists = prev.some((p) => normalizeUrl(p) === val);
			if (exists) return prev;
			return [...prev, val];
		});

		setLinkInput('');
		linkInputRef.current?.focus();
	}
	function removeLink(idxGlobal) {
		const url = visibleLinks[idxGlobal];
		const firstIndex = links.indexOf(url);
		if (firstIndex !== -1)
			setLinks((prev) => prev.filter((_, i) => i !== firstIndex));
	}

	function validate() {
		if (!name.trim()) return 'Название обязательно';
		if (!searchType) return 'Тип поиска обязателен';
		if (searchType === 'by_text') {
			if (!searchInput.trim()) return 'Запрос обязателен';
			if (!itemsSortType) return 'Сортировка объявлений обязательна';
			if (!feedbacksSortType) return 'Сортировка отзывов обязательна';
		} else {
			if (!links || links.length === 0)
				return 'Нужно добавить хотя бы одну ссылку';
			if (!feedbacksSortType) return 'Сортировка отзывов обязательна';
		}
		return null;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		if (readOnly) return;
		setError(null);

		const v = validate();
		if (v) {
			setError(v);
			return;
		}

		const dto = {
			name: name.trim(),
			description: description.trim() || null,
			feedbacksPerItemLimit: limitFeedbacksEnabled
				? feedbacksPerItemLimit
				: null,
			feedbacksSortType,
			searchType,
		};
		if (searchType === 'by_text') {
			dto.searchInput = searchInput.trim();
			dto.itemsLimit = limitItemsEnabled ? itemsLimit : null;
			dto.itemsSortType = itemsSortType;
			dto.links = null;
		} else {
			dto.links = links;
			dto.searchInput = null;
			dto.itemsLimit = null;
			dto.itemsSortType = null;
		}

		setSubmitting(true);
		const res = await updateParsingJob(id, dto);
		setSubmitting(false);

		if (!res.ok) {
			const msg =
				typeof res.error === 'string'
					? res.error
					: res.error?.message || JSON.stringify(res.error);
			setError(`Ошибка сохранения: ${msg}`);
			return;
		}

		navigate(`/jobs/${res.id ?? id}`, {
			state: { toast: 'Изменения сохранены' },
		});
	}

	async function handleSaveAsNew() {
		setError(null);

		const v = validate();
		if (v) {
			setError(v);
			return;
		}

		const dto = {
			name: name.trim(),
			description: description.trim() || null,
			feedbacksPerItemLimit: limitFeedbacksEnabled
				? feedbacksPerItemLimit
				: null,
			feedbacksSortType,
			searchType,
			creatorId: 1,
			projectId: 1,
		};

		if (searchType === 'by_text') {
			dto.searchInput = searchInput.trim();
			dto.itemsLimit = limitItemsEnabled ? itemsLimit : null;
			dto.itemsSortType = itemsSortType;
			dto.links = null;
		} else {
			dto.links = links;
			dto.searchInput = null;
			dto.itemsLimit = null;
			dto.itemsSortType = null;
		}

		setSavingAsNew(true);
		const res = await createParsingJob(dto);
		setSavingAsNew(false);

		if (!res.ok) {
			const msg =
				typeof res.error === 'string'
					? res.error
					: res.error?.message || JSON.stringify(res.error);
			setError(`Ошибка сохранения: ${msg}`);
			return;
		}

		const newId = res.id || res.data?.id;
		navigate(`/jobs/${newId}`, {
			state: { toast: 'Сохранено как новый анализ' },
		});
	}

	if (loading)
		return <div className="text-gray-500 px-8 py-12">Загрузка...</div>;
	if (error) return <div className="text-red-600 px-8 py-12">{error}</div>;

	return (
		<div className="max-w-6xl mx-auto">
			<h1 className="text-4xl font-extrabold mb-8">Редактирование анализа</h1>

			<div className="mb-6 flex flex-wrap gap-3">
				<button
					type="button"
					onClick={handleSaveAsNew}
					disabled={savingAsNew}
					className="border border-primary text-primary bg-white rounded-[7px] h-[44px] px-5 text-sm font-medium hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none">
					{savingAsNew ? 'Сохраняю...' : 'Сохранить как новый анализ'}
				</button>
			</div>

			{readOnly && (
				<div className="mb-4 p-3 rounded-md border border-yellow-400 bg-yellow-50 text-sm text-yellow-800">
					Этот анализ нельзя редактировать (статус: <b>{jobStatus}</b>).
					Доступно только в статусе <b>init</b>.
				</div>
			)}

			<form
				onSubmit={handleSubmit}
				className={`bg-white rounded-md shadow-subtle border border-gray-200 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
				<div className="space-y-6">
					<div>
						<label className="block text-sm font-medium mb-2">Название *</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full border rounded-md px-4 py-2 text-sm"
							placeholder="Введите название анализа"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Описание</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full border rounded-md px-4 py-2 text-sm"
							rows={6}
							placeholder="Опишите суть анализа"
						/>
					</div>

					<div className="pt-4 flex gap-3">
						<button
							type="submit"
							disabled={submitting || readOnly}
							className="
                bg-primary text-white rounded-[7px]
                flex items-center justify-center
                h-[60px] w-[180px]
                px-4 text-base font-medium
                hover:shadow-md active:translate-y-[1px]
                disabled:opacity-50
              ">
							{submitting ? 'Сохранение...' : 'Сохранить'}
						</button>

						<button
							type="button"
							onClick={() => navigate('/jobs')}
							className="
                border border-gray-800 text-gray-800 bg-white
                rounded-[7px] h-[60px] w-[140px] px-5 text-base font-medium
              ">
							Отмена
						</button>

						{error && <div className="text-red-600 text-sm mt-3">{error}</div>}
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<div className="block text-sm font-medium mb-2">Тип поиска *</div>
						<div className="flex gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setSearchType('by_links')}
								className={`
                  rounded-[7px] border
                  h-[50px] w-[242px]
                  flex items-center justify-center text-sm font-medium
                  ${searchType === 'by_links' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-800 border-gray-300'}
                `}>
								по ссылке
							</button>

							<button
								type="button"
								onClick={() => setSearchType('by_text')}
								className={`
                  rounded-[7px] border
                  h-[50px] w-[242px]
                  flex items-center justify-center text-sm font-medium
                  ${searchType === 'by_text' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-800 border-gray-300'}
                `}>
								по текстовому запросу
							</button>
						</div>
					</div>

					{searchType === 'by_text' && (
						<div className="space-y-6">
							<div>
								<label className="block text-sm font-medium mb-2">
									Запрос *
								</label>
								<textarea
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									className="w-full border rounded-md px-4 py-2 text-sm"
									rows={2}
									placeholder="Напишите запрос"
									required
								/>
							</div>

							<div className="space-y-2">
								<Checkbox
									checked={limitFeedbacksEnabled}
									onChange={setLimitFeedbacksEnabled}
									label="Ограничение на число отзывов в объявлении"
								/>
								<NumberStepper
									value={feedbacksPerItemLimit}
									onChange={setFeedbacksPerItemLimit}
									min={1}
									disabled={!limitFeedbacksEnabled}
								/>
							</div>

							<div className="space-y-2">
								<Checkbox
									checked={limitItemsEnabled}
									onChange={setLimitItemsEnabled}
									label="Ограничение на число объявлений"
								/>
								<NumberStepper
									value={itemsLimit}
									onChange={setItemsLimit}
									min={1}
									disabled={!limitItemsEnabled}
								/>
							</div>

							<div className="sr-only">
								<label className="block text-sm font-medium">
									Сортировка объявлений *
								</label>
								<select
									className="w-full border rounded-md px-3 py-2 text-sm"
									value={itemsSortType}
									onChange={(e) => setItemsSortType(e.target.value)}
									aria-hidden="true"
									tabIndex={-1}>
									{ITEM_SORT_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>

							<div className="sr-only">
								<label className="block text-sm font-medium">
									Сортировка отзывов в объявлении *
								</label>
								<select
									className="w-full border rounded-md px-3 py-2 text-sm"
									value={feedbacksSortType}
									onChange={(e) => setFeedbacksSortType(e.target.value)}
									aria-hidden="true"
									tabIndex={-1}>
									{FEEDBACK_SORT_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
						</div>
					)}

					{searchType === 'by_links' && (
						<div className="space-y-6">
							<div>
								<label className="block text-sm font-medium mb-2">
									Ссылки на товары *
								</label>

								<div className="flex gap-2 items-center mb-3">
									<input
										ref={linkInputRef}
										value={linkInput}
										onChange={(e) => setLinkInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addLink();
											}
										}}
										className="flex-1 border rounded-md px-3 py-2 text-sm"
										placeholder="Вставьте ссылку и нажмите Enter"
									/>
									<button
										type="button"
										onClick={addLink}
										className="border rounded-md px-3 py-2 text-sm">
										Добавить
									</button>
								</div>

								<div className="space-y-2">
									{visibleLinks.length === 0 ? (
										<div className="text-sm text-gray-500">
											Ссылки не добавлены
										</div>
									) : (
										visibleLinks.map((url, idx) => (
											<div
												key={idx}
												className="flex items-start gap-2 border rounded-md px-3 py-2 text-sm bg-white">
												<div className="flex-1 break-all text-gray-800">
													{url}
												</div>
												<button
													type="button"
													className="text-gray-500 hover:text-red-600 text-xs px-2 leading-none"
													onClick={() => removeLink(idx)}>
													✕
												</button>
											</div>
										))
									)}
								</div>

								{links.length > 4 && (
									<button
										type="button"
										className="flex items-center gap-1 text-sm text-gray-700 mt-2"
										onClick={() => setShowAllLinks(!showAllLinks)}>
										<span>{showAllLinks ? 'Скрыть' : 'Смотреть все'}</span>
										<span className="text-lg leading-none">
											{showAllLinks ? '▲' : '▼'}
										</span>
									</button>
								)}
							</div>

							<div className="space-y-2">
								<Checkbox
									checked={limitFeedbacksEnabled}
									onChange={setLimitFeedbacksEnabled}
									label="Ограничение на число отзывов в объявлении"
								/>
								<NumberStepper
									value={feedbacksPerItemLimit}
									onChange={setFeedbacksPerItemLimit}
									min={1}
									disabled={!limitFeedbacksEnabled}
								/>
							</div>

							<div className="sr-only">
								<label className="block text-sm font-medium">
									Сортировка отзывов в объявлении *
								</label>
								<select
									className="w-full border rounded-md px-3 py-2 text-sm"
									value={feedbacksSortType}
									onChange={(e) => setFeedbacksSortType(e.target.value)}
									aria-hidden="true"
									tabIndex={-1}>
									{FEEDBACK_SORT_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
				</div>
			</form>
		</div>
	);
}
