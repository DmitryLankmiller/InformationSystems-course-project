import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createParsingJob } from '../api/parsingJobs';
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

export default function CreateParsingJob() {
	const navigate = useNavigate();

	const [name, setName] = useState('');
	const [description, setDescription] = useState('');

	const [website, setWebsite] = useState('wildberries');

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

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	function addLink() {
		const val = linkInput.trim();
		if (!val) return;
		if (!links.includes(val)) {
			setLinks((prev) => [...prev, val]);
		}
		setLinkInput('');
		if (linkInputRef.current) linkInputRef.current.focus();
	}
	function removeLink(idxGlobal) {
		const url = visibleLinks[idxGlobal];
		const firstIndex = links.indexOf(url);
		if (firstIndex !== -1) {
			setLinks((prev) => prev.filter((_, i) => i !== firstIndex));
		}
	}

	const visibleLinks = showAllLinks ? links : links.slice(0, 4);

	function validate() {
		if (!name.trim()) return 'Название обязательно';
		if (!searchType) return 'Тип поиска обязателен';

		if (searchType === 'by_text') {
			if (!searchInput.trim()) return 'Запрос обязателен';
			if (!itemsSortType) return 'Сортировка объявлений обязательна';
			if (!feedbacksSortType) return 'Сортировка отзывов обязательна';
		}

		if (searchType === 'by_links') {
			if (!links || links.length === 0)
				return 'Нужно добавить хотя бы одну ссылку';
			if (!feedbacksSortType) return 'Сортировка отзывов обязательна';
		}

		return null;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setError(null);

		const v = validate();
		if (v) {
			setError(v);
			return;
		}

		const dto = {
			name: name.trim(),
			description: description.trim() || null,
			website,

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
		} else {
			dto.links = links;
		}

		setSubmitting(true);
		try {
			const res = await createParsingJob(dto);
			if (res.ok) {
				const newId = res.id || res.data?.id;
				navigate(`/jobs/${newId}`, { state: { toast: 'Анализ создан' } });
			} else {
				const errMsg =
					typeof res.error === 'string'
						? res.error
						: res.error?.message || JSON.stringify(res.error);
				setError(`Ошибка сервера: ${errMsg}`);
			}
		} catch (err) {
			setError('Не удалось отправить запрос: ' + err.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="max-w-6xl mx-auto">
			<h1 className="text-4xl font-extrabold mb-8">Создание нового анализа</h1>

			<form
				onSubmit={handleSubmit}
				className="bg-white rounded-md shadow-subtle border border-gray-200 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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

					<div className="pt-4">
						<button
							type="submit"
							disabled={submitting}
							className="
                bg-primary text-white rounded-[7px]
                flex items-center justify-center
                h-[60px] w-[317px]
                px-4 text-base font-medium
                hover:shadow-md active:translate-y-[1px]
              ">
							{submitting ? 'Создание...' : 'Создать анализ'}
						</button>

						{error && <div className="text-red-600 text-sm mt-3">{error}</div>}
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<div>
							<label className="block text-sm font-medium mb-2">
								Источник *
							</label>
							<select
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								className="w-full border rounded-md px-4 py-2 text-sm">
								<option value="wildberries">Wildberries</option>
							</select>
						</div>

						<div className="block text-sm font-medium mb-2">Тип поиска *</div>

						<div className="flex gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setSearchType('by_links')}
								className={`
                  rounded-[7px] border
                  h-[50px] w-[242px]
                  flex items-center justify-center text-sm font-medium
                  ${
										searchType === 'by_links'
											? 'bg-primary text-white border-primary'
											: 'bg-white text-gray-800 border-gray-300'
									}
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
                  ${
										searchType === 'by_text'
											? 'bg-primary text-white border-primary'
											: 'bg-white text-gray-800 border-gray-300'
									}
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
								<label className="block text-sm font-medium text-gray-800">
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
								<label className="block text-sm font-medium text-gray-800">
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
								<label className="block text-sm font-medium text-gray-800">
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
