import { BrowserContext, Locator, Page } from 'playwright';
import { BasePage } from './base.page';
import { expect } from 'playwright/test';
import { ItemPage } from './item.page';
import { sleep } from 'crawlee';

export class SearchPage extends BasePage {
  private readonly DIDNT_FIND_TEXT = 'ничего не нашлось';

  private readonly searchResultText: Locator;
  private readonly pagination: Locator;
  private readonly paginationNextBtn: Locator;
  private readonly cardsList: Locator;
  private readonly cardsLocator: Locator;
  private currentPage: number;

  constructor(page: Page) {
    super(page);
    this.currentPage = 1;
    this.searchResultText = this.page.locator('xpath=.//p[contains(@class, "searching-results__text")]');
    // this.pagination = this.page.locator('xpath=.//div[@class="pagination"]');
    this.pagination = this.page.locator('xpath=.//section[@class="search-tags"] ');
    this.paginationNextBtn = this.pagination.locator('xpath=.//a[contains(@class, "pagination-next")]');
    this.cardsList = this.page.locator("xpath=.//*[@class='product-card-list']");
    this.cardsLocator = this.cardsList.locator('xpath=.//div[contains(@class, "product-card__wrapper")]/a[@href]');
  }

  public async isSearchSuccess() {
    return !(
      (await this.searchResultText.isVisible()) &&
      (await this.searchResultText.innerText()).includes(this.DIDNT_FIND_TEXT)
    );
  }

  public async haveNextPage() {
    return await this.paginationNextBtn.isEnabled();
  }

  public async clickNextPageBtn() {
    await this.paginationNextBtn.click();
    this.currentPage += 1;
  }

  public async getCardsCount() {
    return (await this.cardsLocator.all()).length;
  }

  public async loadNthCardsOnPage(nth: number) {
    let prevCount = await this.getCardsCount();
    let haveLoaded = true;
    while (prevCount < nth && haveLoaded) {
      await this.pagination.scrollIntoViewIfNeeded();
      await sleep(1_000);
      const currentCount = await this.getCardsCount();
      haveLoaded = currentCount > prevCount;
      prevCount = currentCount;
    }
  }

  public async getLinksFromCurrentPage(): Promise<string[]> {
    let hrefs: string[] = [];
    const cards = await this.cardsLocator.all();
    for (let card of cards) {
      let href = await card.getAttribute('href');
      if (href !== null) hrefs.push(href);
    }
    return hrefs;
  }

  public async getItemPagesByLinks(links: string[], context: BrowserContext) {
    const itemPages = [];
    for (let link of links) {
      itemPages.push(new ItemPage(await context.newPage(), link));
    }
    return itemPages;
  }

  public async getItemPagesFromCurrentPage(context: BrowserContext) {
    const links = await this.getLinksFromCurrentPage();
    let itemPages: ItemPage[] = [];
    for (let link of links) itemPages.push(new ItemPage(await context.newPage(), link));
    return itemPages;
  }

  public async getNthOrLessLinks(nth: number) {
    const links = [];
    await this.loadNthCardsOnPage(nth);
    links.push(...(await this.getLinksFromCurrentPage()));
    while (links.length < nth && (await this.haveNextPage())) {
      await this.clickNextPageBtn();
      await this.cardsList.isVisible();
      await this.loadNthCardsOnPage(nth);
      links.push(...(await this.getLinksFromCurrentPage()));
    }
    links.length = nth;
    return links;
  }

  public async getNthOrLessItemPages(nth: number, context: BrowserContext) {
    const itemPages = [];
    await this.loadNthCardsOnPage(nth);
    itemPages.push(...(await this.getItemPagesFromCurrentPage(context)));
    while (itemPages.length < nth && (await this.haveNextPage())) {
      await this.clickNextPageBtn();
      await this.cardsList.isVisible();
      await this.loadNthCardsOnPage(nth);
      itemPages.push(...(await this.getItemPagesFromCurrentPage(context)));
    }
    itemPages.length = nth;
    return itemPages;
  }
}
