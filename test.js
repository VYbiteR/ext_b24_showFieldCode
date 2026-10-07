const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let observer;
let storageListener;
let cardPresent = false;
let button;
let code = 'PARENT_ID_2';
let copied;
const timers = [];

const title = {
  querySelector: () => button,
  append: (element) => { button = element; },
};
const field = {
  getAttribute: () => code,
  matches: () => false,
  querySelector: () => null,
  closest: () => ({ querySelector: () => title }),
};
const document = {
  documentElement: {},
  querySelector: () => cardPresent ? {} : null,
  querySelectorAll: (selector) => selector.startsWith('.b24-field-code-copy')
    ? (button ? [button] : [])
    : (cardPresent ? [field] : []),
  createElement: () => ({
    dataset: {},
    style: {},
    handlers: {},
    setAttribute() {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    remove() { button = undefined; },
  }),
};

vm.runInNewContext(fs.readFileSync('content.js', 'utf8'), {
  document,
  navigator: { clipboard: { writeText: async (text) => { copied = text; } } },
  chrome: {
    storage: {
      local: { get: async () => ({ enabled: true }) },
      onChanged: { addListener: (listener) => { storageListener = listener; } },
    },
  },
  MutationObserver: class {
    constructor(callback) { observer = callback; }
    observe() {}
  },
  setTimeout: (callback) => { timers.push(callback); return timers.length; },
  clearTimeout: () => {},
});

(async () => {
  await Promise.resolve();
  assert.equal(button, undefined);

  cardPresent = true;
  observer();
  timers.shift()();
  assert.ok(button);

  await button.handlers.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(copied, 'PARENT_ID_2');
  assert.equal(button.dataset.status, 'Скопировано');

  storageListener({ enabled: { newValue: false } }, 'local');
  assert.equal(button, undefined);
  storageListener({ enabled: { newValue: true } }, 'local');
  assert.ok(button);

  code = 'UF_CRM_TEST';
  await button.handlers.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(copied, 'UF_CRM_TEST');
  console.log('ok');
})().catch((error) => { console.error(error); process.exitCode = 1; });
