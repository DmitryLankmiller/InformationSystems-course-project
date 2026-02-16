import { Locator, Page } from 'playwright';
import { BasePage } from './base.page';
import { FeedbackItem } from './feedback.item';
import { sleep } from '../utils/utils';

export class FeedbacksPage extends BasePage {
  private readonly CHECK_INTERVAL_MS = 500;
  private readonly ATTEMPTS_COUNT = 6;
  private readonly WAIT_FOR_VISIBLE_ATTEMPTS = 60;

  private readonly url: string;
  private readonly commentsList: Locator;
  private readonly feedbackItems: Locator;
  private readonly footer: Locator;

  constructor(page: Page, url?: string) {
    super(page);
    this.commentsList = this.page.locator('xpath=.//ul[@class="comments__list"]');
    this.feedbackItems = this.commentsList.locator('xpath=./li[@itemprop="review"]');
    this.footer = this.page.locator('xpath=.//*[@id="footer"]');
    this.url = url ? url : '/';
  }

  public async open() {
    await this.page.goto(this.url);
  }

  public async getFeedbacksCount() {
    return (await this.feedbackItems.all()).length;
  }

  public async waitForFeedbacksVisible() {
    for (let i = 0; i < this.WAIT_FOR_VISIBLE_ATTEMPTS; i++) {
      if ((await this.getFeedbacksCount()) !== 0) break;
      await sleep(this.CHECK_INTERVAL_MS);
    }
  }

  public async loadMoreFeedbacks() {
    const startCount: number = await this.getFeedbacksCount();
    await this.footer.scrollIntoViewIfNeeded();
    for (let i = 0; i < this.ATTEMPTS_COUNT; i++) {
      if (startCount === (await this.getFeedbacksCount())) {
        await sleep(this.CHECK_INTERVAL_MS);
        continue;
      } else {
        return true;
      }
    }
    return startCount !== (await this.getFeedbacksCount());
  }

  public async loadNthOrMoreFeedbacks(n: number) {
    let haveLoaded = true;
    let currentCount = await this.getFeedbacksCount();
    while (haveLoaded && currentCount < n) {
      haveLoaded = await this.loadMoreFeedbacks();
      currentCount = await this.getFeedbacksCount();
    }
  }

  public async getFeedbackItems() {
    return (await this.feedbackItems.all()).map((feedbackLocator) => new FeedbackItem(feedbackLocator));
  }

  public async getNthOrLessFeedbackItems(nth: number) {
    await this.loadNthOrMoreFeedbacks(nth);
    const feedbackItems = await this.getFeedbackItems();
    if (feedbackItems.length > nth) feedbackItems.length = nth;
    return feedbackItems;
  }
}
