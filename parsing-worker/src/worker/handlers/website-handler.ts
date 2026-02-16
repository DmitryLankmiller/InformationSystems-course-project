import { SortType } from '../../utils/types';

export type Website = 'wildberries';

export type CollectLinksInput = {
	jobId: number;
	searchInput: string;
	itemsLimit: number;
	itemsSortType: SortType | null;
};

export type ParseLinkInput = {
	jobId: number;
	url: string;
	feedbacksPerItemLimit: number;
	feedbacksSortType: SortType | null;
};

export type KafkaFeedbackMessage = {
	jobId: number;
	feedback: {
		feedback_text: string;
		feedback_rating: number | null;
		feedback_state: string | null;
		feedback_date: string | null;
		advantages_text: string | null;
		disadvantages_text: string | null;
		comment_text: string | null;
		source_url: string;
	};
};

export interface WebsiteHandler {
	website: Website | string;
	collectLinks(input: CollectLinksInput): Promise<string[]>;
	parseLink(input: ParseLinkInput): Promise<KafkaFeedbackMessage[]>;
}
