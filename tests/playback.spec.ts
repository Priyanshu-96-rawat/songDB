import { expect, test } from "@playwright/test";

test.describe("Playback smoke test", () => {
    test("plays multiple visible tracks from the home feed", async ({ page }) => {
        await page.goto("/");

        const cards = page.getByTestId("music-card");
        await expect(cards.first()).toBeVisible();

        const cardCount = await cards.count();
        const attempts = Math.min(cardCount, 3);
        const tracksToVerify: Array<{ videoId: string; title: string }> = [];

        for (let index = 0; index < attempts; index += 1) {
            const card = cards.nth(index);
            const videoId = await card.getAttribute("data-track-id");
            const title = await card.getAttribute("data-track-title");

            expect(videoId).toBeTruthy();
            expect(title).toBeTruthy();

            tracksToVerify.push({
                videoId: videoId!,
                title: title!,
            });
        }

        for (const track of tracksToVerify) {
            const card = page.locator(`[data-testid="music-card"][data-track-id="${track.videoId}"]`).first();
            const streamResponsePromise = page.waitForResponse((response) => {
                const url = response.url();
                return url.includes("/api/youtube-stream") && url.includes(`id=${track.videoId}`);
            });

            await card.click();

            const streamResponse = await streamResponsePromise;
            expect(streamResponse.status(), `unexpected stream status for ${track.videoId}`).toBeGreaterThanOrEqual(200);
            expect([200, 206]).toContain(streamResponse.status());

            const playerBar = page.getByTestId("player-bar");
            await expect(playerBar).toBeVisible();
            await expect(playerBar).toHaveAttribute("data-track-id", track.videoId);
            await expect(page.getByTestId("player-track-title")).toHaveText(track.title);

            await page.waitForFunction(
                () => {
                    const player = document.querySelector<HTMLElement>('[data-testid="player-bar"]');
                    if (!player) {
                        return false;
                    }

                    return Number(player.dataset.progressSeconds ?? "0") >= 1;
                },
                undefined,
                { timeout: 15_000 }
            );

            await expect(playerBar).toHaveAttribute("data-playback-state", "playing");
        }
    });

    test("keeps playback alive across internal navigation", async ({ page }) => {
        await page.goto("/");

        const firstCard = page.getByTestId("music-card").first();
        await expect(firstCard).toBeVisible();
        await firstCard.click();

        const playerBar = page.getByTestId("player-bar");
        await expect(playerBar).toBeVisible();

        await page.waitForFunction(
            () => {
                const player = document.querySelector<HTMLElement>('[data-testid="player-bar"]');
                if (!player) {
                    return false;
                }

                return Number(player.dataset.progressSeconds ?? "0") >= 1;
            },
            undefined,
            { timeout: 15_000 }
        );

        const before = Number((await playerBar.getAttribute("data-progress-seconds")) ?? "0");

        await page.getByRole("link", { name: "Search" }).first().click();
        await page.waitForURL(/\/search$/);
        await expect(playerBar).toBeVisible();
        await expect(playerBar).toHaveAttribute("data-playback-state", "playing");

        await page.waitForFunction(
            (startProgress) => {
                const player = document.querySelector<HTMLElement>('[data-testid="player-bar"]');
                if (!player) {
                    return false;
                }

                return Number(player.dataset.progressSeconds ?? "0") > startProgress;
            },
            before,
            { timeout: 15_000 }
        );
    });
});
