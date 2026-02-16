export type SortType = 'date_asc' | 'date_desc' | 'rating_asc' | 'rating_desc';

export type ParsingJobMessage =
	| {
			type: 'collect_links';
			jobId: number;
			searchInput: string;
			website?: string | null;
			itemsLimit?: number | null;
			itemsSortType?: SortType | null;
			feedbacksPerItemLimit?: number | null;
			feedbacksSortType?: SortType | null;
	  }
	| {
			type: 'parse_links';
			jobId: number;
			links: string[];
			website?: string | null;
			feedbacksPerItemLimit?: number | null;
			feedbacksSortType?: SortType | null;
	  };
