const { test, expect, chromium } = require("@playwright/test");
const path = require("path");

const extensionPath = path.resolve(__dirname, "..");

async function getExtensionWorker(context) {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent("serviceworker");
  }
  return worker;
}

async function findMiniPlayerPage(context) {
  let playerPage = null;
  await expect.poll(async () => {
    for (const candidate of context.pages()) {
      if (!candidate.isClosed() && await candidate.locator("#better-picture-root").count()) {
        playerPage = candidate;
        return true;
      }
    }
    return false;
  }).toBe(true);
  return playerPage;
}

async function sendMessageToFixture(worker, message) {
  return worker.evaluate(async ({ fixtureUrl, messageToSend }) => {
    const tabs = await chrome.tabs.query({ url: `${fixtureUrl}*` });
    if (!tabs[0]?.id) {
      throw new Error(`Fixture tab was not found for ${fixtureUrl}`);
    }
    return chrome.tabs.sendMessage(tabs[0].id, messageToSend);
  }, {
    fixtureUrl: "http://127.0.0.1:8765/fixture.html",
    messageToSend: message
  });
}

test("starts the mini-player, exposes captions and restores the source video", async () => {
  const context = await chromium.launchPersistentContext("", {
    channel: process.env.BROWSER_CHANNEL || "chromium",
    headless: !process.argv.includes("--headed"),
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-sync",
      "--no-first-run"
    ]
  });

  try {
    const worker = await getExtensionWorker(context);
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/fixture.html");
    await expect.poll(() => page.evaluate(() => Boolean(window.fixtureReady))).toBe(true);
    await expect(page.locator("#fixture-video")).toBeVisible();

    const initialStatus = await sendMessageToFixture(worker, {
      type: "BETTER_PICTURE_STATUS_REQUEST"
    });
    expect(initialStatus).toMatchObject({ hasVideo: true, isRunning: false });

    const startedStatus = await sendMessageToFixture(worker, {
      type: "BETTER_PICTURE_START"
    });
    expect(startedStatus).toMatchObject({ hasVideo: true, isRunning: true });
    expect(["pageOverlay", "documentPip"]).toContain(startedStatus.displayMode);

    const playerPage = await findMiniPlayerPage(context);
    const miniPlayer = playerPage.locator("#better-picture-root");
    await expect(miniPlayer).toBeVisible();
    await expect(miniPlayer.locator("video#fixture-video")).toBeVisible();
    await expect(miniPlayer.locator(".better-picture-subtitles")).toContainText(
      "Automated caption is visible."
    );
    await expect(miniPlayer.getByRole("button", { name: /pause video/i })).toBeVisible();
    await expect(page.locator("#video-host > #fixture-video")).toHaveCount(0);

    const stoppedStatus = await sendMessageToFixture(worker, {
      type: "BETTER_PICTURE_STOP"
    });
    expect(stoppedStatus.isRunning).toBe(false);
    await expect.poll(async () => {
      if (playerPage.isClosed()) return true;
      try {
        return await miniPlayer.count() === 0;
      } catch {
        return playerPage.isClosed();
      }
    }).toBe(true);
    await expect(page.locator("#video-host > #fixture-video")).toBeVisible();
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});
