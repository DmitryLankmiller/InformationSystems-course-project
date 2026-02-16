import { Link } from 'react-router-dom';

export default function JobCard({ job, statusIconMap }) {
	const iconSrc = statusIconMap[job.status] || statusIconMap.init;

	return (
		<Link
			to={`/jobs/${job.id}`}
			className="block bg-white rounded-md shadow-subtle border border-gray-200 p-6 hover:shadow-md transition-shadow">
			<div className="flex items-start justify-between mb-4">
				<div className="text-primary font-semibold text-lg leading-snug">
					{job.name || `Анализ #${job.id}`}
				</div>
				<img src={iconSrc} alt={job.status || 'status'} className="w-8 h-8" />
			</div>

			{job.description && (
				<p className="text-[13px] text-gray-700 leading-snug line-clamp-4 mb-4">
					{job.description}
				</p>
			)}

			{/* можно потом вставить подпись статуса текстом */}
		</Link>
	);
}
