import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownView({ text }) {
	if (!text) return <div className="text-sm text-gray-500">no data</div>;

	return (
		<div className="prose prose-sm max-w-none">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
		</div>
	);
}
