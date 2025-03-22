import { test, expect, type Locator, type Page } from "@playwright/test";

test("Hacker articles 1-100 are ordered newest to oldest", async ({ page }) => {
  await page.goto("https://news.ycombinator.com/newest");
  await page.waitForLoadState("networkidle");
  const limit = 100;
  const allAgeSpanTitles = await getAllAgeSpanTitlesUpToLimit(limit, page);
  expect(allAgeSpanTitles.length).toBe(limit);
  const unixTimestamps = getTimestamps(allAgeSpanTitles);
  assertArticlesAreInCorrectOrder(unixTimestamps);
  await page.close();
});

async function getAllAgeSpanTitlesUpToLimit(
  limit: number,
  page: Page
): Promise<string[]> {
  const ageSpanTitles: string[] = [];
  while (ageSpanTitles.length < limit) {
    const newAgeSpanTitles = await getTitleAttrbuteFromAgeSpanElements(page);
    ageSpanTitles.push(...newAgeSpanTitles);
    await navToNextPageIfNeeded(page);
  }
  return ageSpanTitles.slice(0, limit);
}

async function getTitleAttrbuteFromAgeSpanElements(
  page: Page
): Promise<string[]> {
  const titles: string[] = [];
  const timeElements = await page.locator("span.age").all();
  for (const timeElement of timeElements) {
    const titleAttr = await timeElement.getAttribute("title");
    if (!titleAttr) {
      throw new Error(
        `Title attribute is missing from element #${timeElement} on ${page.url}`
      );
    }
    titles.push(titleAttr);
  }
  return titles;
}

function getTimestamps(allAgeSpanTitles: string[]): number[] {
  const unixTimeStamps = allAgeSpanTitles.map((title, index) => {
    return getTimeStampFromTitle(title, index + 1);
  });
  return unixTimeStamps;
}

// Input title string: "2025-03-20T15:06:24 1742483184"; output unix timstamp number: 1742483184
function getTimeStampFromTitle(title: string, articleNumber: number): number {
  const titleWords = title.split(" ");
  if (titleWords.length !== 2) {
    throw new Error(
      `Expected title to have 2 items, but got "${title}" at article #${articleNumber}`
    );
  }
  if (isNaN(Number(titleWords[1]))) {
    throw new Error(
      `Expected a number, but got "${titleWords[1]}" at article #${articleNumber}`
    );
  }
  return Number(titleWords[1]);
}

async function navToNextPageIfNeeded(page: Page) {
  const moreButton = page.locator("a.morelink");
  if ((await moreButton.count()) > 0) {
    await moreButton.click();
    await page.waitForLoadState("domcontentloaded");
  } else {
    throw new Error(
      `At ${page.url}, the 'More' button is missing, or there are no more pages available`
    );
  }
}

function assertArticlesAreInCorrectOrder(timestamps: number[]) {
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] > timestamps[i - 1]) {
      throw new Error(
        `Article #${i + 1} is not in newest to oldest order. The timestamp ${
          timestamps[i]
        } should be <= ${timestamps[i - 1]}`
      );
    }
  }
}
