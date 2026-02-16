import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchParsingJobs } from '../api/parsingJobs';
import JobCard from '../components/JobCard';
import { STATUS_ICON_MAP } from '../constants/statusIcons';

export default function ParsingJobsPage() {
	const [jobs, setJobs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [query, setQuery] = useState('');

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		fetchParsingJobs()
			.then((res) => {
				if (!mounted) return;
				const list = Array.isArray(res?.data) ? res.data : [];
				setJobs(list);
				if (!res.ok) {
					setError(res.error || 'Ошибка загрузки; показаны тестовые данные.');
				}
				setLoading(false);
			})
			.catch((e) => {
				if (!mounted) return;
				console.error(e);
				setJobs([]);
				setError(e.message);
				setLoading(false);
			});
		return () => {
			mounted = false;
		};
	}, []);

	const safeJobs = Array.isArray(jobs) ? jobs : [];
	const filtered = safeJobs.filter((j) =>
		(j?.name || '').toLowerCase().includes(query.toLowerCase()),
	);

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-4xl font-extrabold mb-6">Созданные анализы</h1>

				<div className="max-w-lg">
					<div className="flex items-center border rounded-md px-3 py-2">
						<img
							src="/assets/search.svg"
							alt="Поиск"
							className="w-4 h-4 mr-3 opacity-60"
						/>
						<input
							placeholder="Введите название анализа"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="flex-1 outline-none text-sm"
						/>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="text-gray-500">Загрузка...</div>
			) : (
				<>
					{error && (
						<div className="text-sm text-red-500 mb-4">Ошибка: {error}</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Link to="/create" className="block">
							<div className="bg-white rounded-md shadow-subtle p-10 flex flex-col items-center justify-center text-center h-full border border-gray-200">
								<div className="mb-4 flex items-center justify-center">
									<img
										src="/assets/add-circle.svg"
										alt="Добавить"
										className="w-10 h-10"
									/>
								</div>
								<div className="text-sm text-gray-600">
									Создать новый анализ
								</div>
							</div>
						</Link>

						{filtered.length === 0 ? (
							<div className="col-span-full text-gray-500">
								Анализы не найдены.
							</div>
						) : (
							filtered.map((job) => (
								<JobCard
									key={job.id}
									job={job}
									statusIconMap={STATUS_ICON_MAP}
								/>
							))
						)}
					</div>
				</>
			)}
		</div>
	);
}
