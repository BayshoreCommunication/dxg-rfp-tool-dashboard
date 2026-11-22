import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, setTheme } from "./theme";

// The script in <head> that applies a saved choice before the first paint.
const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

describe("theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
  });

  test("a saved dark choice is applied over the light page the server rendered", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("a saved light choice turns off the development dark preview", () => {
    document.documentElement.classList.add("dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    runInitScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("with no choice saved, or an unknown value, the server's theme stands", () => {
    document.documentElement.classList.add("dark");
    runInitScript();
    expect(document.documentElement).toHaveClass("dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runInitScript();
    expect(document.documentElement).toHaveClass("dark");
  });

  test("setTheme switches the page and saves the choice", () => {
    setTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    setTheme("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
