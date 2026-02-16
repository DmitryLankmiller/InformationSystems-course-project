export class FeedbackDTO {
	private _feedbackText: string;
	private _feedbackRating: number;
	private _feedbackState?: FeedbackState;
	private _feedbackDate?: Date;
	private _advantagesText?: string;
	private _disadvantagesText?: string;
	private _commentText?: string;

	constructor(
		feedbackText: string,
		feedbackRating: number,
		feedbackState?: FeedbackState,
		feedbackDate?: Date,
		advantagesText?: string,
		disadvantagesText?: string,
		commentText?: string,
	) {
		this._feedbackText = feedbackText;
		this._feedbackRating = feedbackRating;
		this._feedbackState = feedbackState;
		this._feedbackDate = feedbackDate;
		this._advantagesText = advantagesText;
		this._disadvantagesText = disadvantagesText;
		this._commentText = commentText;
	}

	public get feedbackText() {
		return this._feedbackText;
	}

	public set feedbackText(_feedbackText: string) {
		this._feedbackText = _feedbackText;
	}

	public get feedbackRating() {
		return this._feedbackRating;
	}

	public set feedbackRating(_feedbackRating: number) {
		this._feedbackRating = _feedbackRating;
	}

	public get feedbackState() {
		return this._feedbackState;
	}

	public set feedbackState(_feedbackState: FeedbackState | undefined) {
		this._feedbackState = _feedbackState;
	}

	public get feedbackDate() {
		return this._feedbackDate;
	}

	public set feedbackDate(_feedbackDate: Date | undefined) {
		this._feedbackDate = _feedbackDate;
	}

	public get advantagesText() {
		return this._advantagesText;
	}

	public set advantagesText(_advantagesText: string | undefined) {
		this._advantagesText = _advantagesText;
	}

	public get disadvantagesText() {
		return this._disadvantagesText;
	}

	public set disadvantagesText(_disadvantagesText: string | undefined) {
		this._disadvantagesText = _disadvantagesText;
	}

	public get commentText() {
		return this._commentText;
	}

	public set commentText(_commentText: string | undefined) {
		this._commentText = _commentText;
	}
}

export enum FeedbackState {
	Purchased = 'Выкупили',
	Returned = 'Вернули',
	Canceled = 'Отказались',
	Pinned = 'Закреплён',
}
