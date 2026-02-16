import { Page } from 'playwright';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }
}
