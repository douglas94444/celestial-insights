import { test, expect } from "@playwright/test";

test.describe("smoke público", () => {
  test("landing mostra herói", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Descubra seu mapa astral/i }),
    ).toBeVisible();
  });

  test("auth mostra separadores Entrar / Criar conta", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Criar conta" })).toBeVisible();
  });

  test("dashboard sem sessão redireciona para auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

const storageState = process.env.PLAYWRIGHT_STORAGE_STATE;

/** Correr localmente: gravar estado após login (ex.: `npx playwright codegen` + Save storage) e definir PLAYWRIGHT_STORAGE_STATE sem SKIP_AUTH_E2E. */
if (!process.env.SKIP_AUTH_E2E && storageState) {
  test.describe("com sessão guardada", () => {
    test.use({ storageState });

    test("dashboard mostra saudação", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: /Olá/i })).toBeVisible({ timeout: 20_000 });
    });
  });
}
