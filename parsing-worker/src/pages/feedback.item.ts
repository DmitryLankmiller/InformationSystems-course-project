import { Locator } from 'playwright';
import { FeedbackDTO, FeedbackState } from '../feedback.dto';

export class FeedbackItem {
  private readonly TODAY_TEXT: string = 'Сегодня';
  private readonly YESTERDAY_TEXT: string = 'Вчера';
  private readonly ADVANTAGES_TEXT: string = 'Достоинства:';
  private readonly DISADV_TEXT: string = 'Недостатки:';
  private readonly COMMENT_TEXT: string = 'Комментарий:';

  private readonly feedbackItem: Locator;
  private readonly feedbackBody: Locator;
  private readonly starsContainer: Locator;
  private readonly feedbackState: Locator;
  private readonly feedbackDate: Locator;
  private readonly feedbackPinned: Locator;

  constructor(feedbackItem: Locator) {
    this.feedbackItem = feedbackItem;
    this.feedbackBody = this.feedbackItem.locator('xpath=.//*[@itemprop="reviewBody"]');
    this.starsContainer = this.feedbackItem.locator(
      'xpath=.//div[@class="feedback__info"]//div[contains(@class, "hide-mobile")]//span[contains(@class, "feedback__rating")]'
    );
    this.feedbackState = this.feedbackItem.locator('xpath=.//div[@class="feedback__state"]');
    this.feedbackDate = this.feedbackItem.locator('xpath=.//div[@class="feedback__date"]');
    this.feedbackPinned = this.feedbackItem.locator('xpath=.//*[@class="feedback__pinned"]');
  }

  public async isFeedbackPinned() {
    return this.feedbackPinned.isVisible();
  }

  public async getFeedbackText(timeout?: number) {
    try {
      return (await this.feedbackBody.innerText({ timeout: timeout })).trim();
    } catch (error) {
      return '';
    }
  }

  public async getStarsCount() {
    const _starsClass = await this.starsContainer.getAttribute('class');
    const starsClass = _starsClass === null ? '' : _starsClass;
    if (starsClass.includes('star1')) {
      return 1;
    } else if (starsClass.includes('star2')) {
      return 2;
    } else if (starsClass.includes('star3')) {
      return 3;
    } else if (starsClass.includes('star4')) {
      return 4;
    } else if (starsClass.includes('star5')) {
      return 5;
    } else {
      return 0;
    }
  }

  public async getFeedbackState() {
    if (!(await this.feedbackState.isVisible())) {
      return undefined;
    }
    const feedbackStateText = (await this.feedbackState.innerText()).trim();
    if (feedbackStateText == FeedbackState.Purchased) {
      return FeedbackState.Purchased;
    } else if (feedbackStateText === FeedbackState.Returned) {
      return FeedbackState.Returned;
    } else if (feedbackStateText === FeedbackState.Canceled) {
      return FeedbackState.Canceled;
    } else {
      throw new Error('Feedback state text is not defined: ' + feedbackStateText);
    }
  }

  private parseMonth(month: string) {
    switch (month) {
      case 'января':
        return 1;
      case 'февраля':
        return 2;
      case 'марта':
        return 3;
      case 'апреля':
        return 4;
      case 'мая':
        return 5;
      case 'июня':
        return 6;
      case 'июля':
        return 7;
      case 'августа':
        return 8;
      case 'сентября':
        return 9;
      case 'октября':
        return 10;
      case 'ноября':
        return 11;
      case 'декабря':
        return 12;
      default:
        throw new Error(`Can't parse month: ${month}`);
    }
  }

  public parseFeedbackDateHTML(innerHTML: string) {
    const date = new Date();
    const text = innerHTML.split('<')[0];
    const dateAndTime = text.split(',');
    const rawDate = dateAndTime[0].trim().split(' ');
    if (rawDate.length === 1) {
      const day = rawDate[0].trim();
      if (day === this.TODAY_TEXT) {
      } else if (day === this.YESTERDAY_TEXT) {
        date.setDate(date.getDate() - 1);
      } else {
        throw new Error(`Can't parse day of feedbackDateHTML: ${text}`);
      }
    } else if (rawDate.length === 2) {
      const [day, month] = rawDate;
      date.setMonth(this.parseMonth(month));
      date.setDate(parseInt(day));
    } else if (rawDate.length === 3) {
      const [day, month, year] = rawDate;
      date.setFullYear(parseInt(year));
      date.setMonth(this.parseMonth(month));
      date.setDate(parseInt(day));
    } else {
      throw new Error(`Can't parse feedbackDateHTML: ${text}`);
    }
    const rawTime = dateAndTime[1].trim();
    const [hoursText, minutesText] = rawTime.split(':');
    date.setHours(parseInt(hoursText));
    date.setMinutes(parseInt(minutesText), 0, 0);
    return date;
  }

  public async getFeedbackDate() {
    const feedbackDateHTML = (await this.feedbackDate.innerHTML()).trim();
    return this.parseFeedbackDateHTML(feedbackDateHTML);
  }

  public async getFeedbackDetailedText(timeout?: number) {
    const feedbackText = await this.getFeedbackText(timeout);
    let feedbackTextRaw = feedbackText;
    let advText;
    let disadvText;
    let commentText;
    if (feedbackTextRaw.includes(this.COMMENT_TEXT)) {
      [feedbackTextRaw, commentText] = feedbackTextRaw.split(this.COMMENT_TEXT);
      commentText = commentText.trim();
    }
    if (feedbackTextRaw.includes(this.DISADV_TEXT)) {
      [feedbackTextRaw, disadvText] = feedbackTextRaw.split(this.DISADV_TEXT);
      disadvText = disadvText.trim();
    }
    if (feedbackTextRaw.includes(this.ADVANTAGES_TEXT)) {
      [, advText] = feedbackTextRaw.split(this.ADVANTAGES_TEXT);
      advText = advText.trim();
    }
    return {
      feedbackText: feedbackText,
      advantagesText: advText,
      disadvantagesText: disadvText,
      commentText: commentText,
    };
  }

  public async getFeedbackDTO(timeout?: number) {
    const feedbackDetailedText = await this.getFeedbackDetailedText(timeout);
    if (await this.isFeedbackPinned()) {
      return new FeedbackDTO(
        feedbackDetailedText.feedbackText,
        await this.getStarsCount(),
        FeedbackState.Pinned,
        undefined,
        feedbackDetailedText.advantagesText,
        feedbackDetailedText.disadvantagesText,
        feedbackDetailedText.commentText
      );
    }
    return new FeedbackDTO(
      feedbackDetailedText.feedbackText,
      await this.getStarsCount(),
      await this.getFeedbackState(),
      await this.getFeedbackDate(),
      feedbackDetailedText.advantagesText,
      feedbackDetailedText.disadvantagesText,
      feedbackDetailedText.commentText
    );
  }
}
