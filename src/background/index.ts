import browser from 'webextension-polyfill';

// Placeholder background service worker. Real wiring (context menus, icon
// state, keyboard command) lands in a later task.
browser.runtime.onInstalled.addListener(() => {
  console.info('[mahalinkam] background worker installed');
});

export {};
