import { WildberriesHandler } from './wildberries.handler';

async function main() {
	const h = new WildberriesHandler();

	const links = await h.collectLinks({
		jobId: 1,
		searchInput: 'футболка мужская',
		itemsLimit: 5,
		itemsSortType: null,
	});

	console.log('Collected links:', links);

	if (links.length > 0) {
		const feedbacks = await h.parseLink({
			jobId: 1,
			url: links[0],
			feedbacksPerItemLimit: 10,
			feedbacksSortType: null,
		});

		console.log('Parsed feedbacks:', feedbacks.slice(0, 3));
		console.log('Parsed feedbacks count:', feedbacks.length);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
