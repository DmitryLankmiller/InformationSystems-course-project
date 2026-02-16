import { Locator, Page } from 'playwright';
import { BasePage } from './base.page';
import { FeedbacksPage } from './feedbacks.page';

export class ItemPage extends BasePage {
  public readonly url: string;
  private readonly reviewsLink: Locator;

  constructor(page: Page, url: string) {
    super(page);
    this.url = url;
    // this.reviewsLink = this.page.locator('xpath=(.//*[contains(@href,"feedbacks")]//div/span)[2]');
    this.reviewsLink = this.page.locator('xpath=.//div[contains(@class, "productPageContent")]//a[contains(@href,"feedbacks")]');
  }

  public async open() {
    await this.page.goto(this.url);
  }

  public getOpenPromise() {
    return this.page.goto(this.url);
  }

  public async openFeedbacks() {
    await this.reviewsLink.click();
    return new FeedbacksPage(this.page);
  }
}
