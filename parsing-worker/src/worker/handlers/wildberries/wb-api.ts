import axios, { AxiosError } from 'axios';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

export function extractItemIdFromUrl(url: string): number {
  return Number(url.split('catalog/')[1].split('/feedbacks')[0]);
}

export function extractImtIdFromUrl(url: string): number {
  return Number(url.split('?imtId=')[1].split("&")[0]);
}

export type WbFeedback = {
  id: string;
  text: string;
  pros?: string;
  cons?: string;
  productValuation?: number;
  createdDate?: string;
  statusId: number; // 14 - отказались, 16 - выкупили, 8 - вернули
};

export type WbFeedbacksResponse = {
  feedbacks?: WbFeedback[];
  feedbackCount?: number;
};

const FEEDBACKS_HOSTS = [
  'https://feedbacks1.wb.ru',
  'https://feedbacks2.wb.ru',
  'https://feedbacks3.wb.ru',
  'https://feedbacks4.wb.ru',
  'https://feedbacks5.wb.ru',
];

export async function fetchFeedbacksPage(itemId: number, imtId: number): Promise<WbFeedbacksResponse> {
  const headers = {
    'User-Agent': UA,
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    Origin: 'https://www.wildberries.ru',
    Referer: `https://www.wildberries.ru/catalog/${itemId}/feedbacks?imtId=${imtId}`,
  };

  let lastErr: unknown;

  for (const host of FEEDBACKS_HOSTS) {
    const url = `${host}/feedbacks/v2/${imtId}`;
    try {
      const { data } = await axios.get(url, {
        headers,
        timeout: 15000,
        responseType: 'json',
        decompress: true,
      });

      const wbData = data as WbFeedbacksResponse;
      if (wbData.feedbackCount == 0) continue;
      return wbData;
    } catch (e) {
      lastErr = e;
      const ax = e as AxiosError;
      const status = ax.response?.status;

      if (status === 404) continue;

      if (!status || (status >= 500 && status <= 599)) continue;

      throw new Error(`WB feedbacks error ${status} on ${url}: ${ax.message}`);
    }
  }

  throw new Error(`All WB feedbacks hosts failed for imtId=${imtId}: ${(lastErr as Error)?.message}`);
}
