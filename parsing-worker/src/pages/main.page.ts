import { Locator, Page } from 'playwright';
import { BasePage } from './base.page';
import { SearchPage } from './search.page';
import { sleep } from 'crawlee';

export const BASE_URL: string = 'https://www.wildberries.ru/';

export class MainPage extends BasePage {
  private readonly search: Locator;
  private readonly searchBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.search = this.page.locator('xpath=.//*[@id="searchInput"]');
    this.searchBtn = this.page.locator('xpath=.//*[@id="applySearchBtn"]');
  }

  public async open() {
    await this.page.goto(BASE_URL);
  }

  public async searchByQuery(query: string) {
    await sleep(1_000);
    // await this.search.click({ force: true });
    await sleep(1_500);
    await this.search.fill(query);
    await sleep(1_500);
    await this.search.fill(query);
    if (await this.searchBtn.isEnabled() && await this.searchBtn.isVisible()) {
      await this.searchBtn.click();
    } else {
      await this.search.press("Enter")
    }
    // await this.searchBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await sleep(1_500);
    // await sleep(1_500);
    return new SearchPage(this.page);
  }
}
