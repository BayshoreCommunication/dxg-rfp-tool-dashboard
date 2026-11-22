// No "use client": the page layout (a server component) reads the script as a string.

// The member's light or dark choice, kept in this browser. With no choice saved, the theme the
// server rendered stands (light in production; the local dark preview in development).
export const THEME_STORAGE_KEY = "rfpilot:theme";
export type Theme = "light" | "dark";

// Runs in <head> before the page paints, so a saved choice never flashes the other theme.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light"){var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.dataset.theme=t}}catch(e){}`;
