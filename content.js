(() => {
  const cardSelector = '.crm-entity-card-container-content';
  const titleSelector = '.crm-entity-widget-content-block-title, .ui-entity-editor-block-title, .ui-entity-editor-block-title-text';
  const buttonClass = 'b24-field-code-copy';
  let enabled = false;
  let scheduled = false;

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch { /* Try the legacy copy command below. */ }
    }

    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    try {
      input.select();
      if (!document.execCommand('copy')) throw new Error('Copy failed');
    } finally {
      input.remove();
    }
  }

  function addButton(field) {
    const code = field.getAttribute('data-field-tag');
    if (!code) return;

    const title = field.matches(titleSelector) ? field : field.querySelector(titleSelector)
      || field.closest('.ui-entity-editor-content-block')?.querySelector(titleSelector);
    if (!title || title.querySelector(`.${buttonClass}`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = buttonClass;
    button.textContent = '⧉';
    button.title = code;
    button.setAttribute('aria-label', `Скопировать код поля ${code}`);
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await copyText(field.getAttribute('data-field-tag'));
        button.dataset.status = 'Скопировано';
      } catch {
        button.dataset.status = 'Не удалось скопировать';
      }
      clearTimeout(button.statusTimeout);
      button.statusTimeout = setTimeout(() => delete button.dataset.status, 1800);
    });
    title.append(button);
  }

  function scan() {
    scheduled = false;
    if (!enabled) return;
    document.querySelectorAll(`${cardSelector} [data-field-tag]`).forEach(addButton);
  }

  function scheduleScan() {
    if (!enabled || scheduled || !document.querySelector(cardSelector)) return;
    scheduled = true;
    setTimeout(scan, 100);
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.local.get({ enabled: true }).then((value) => {
    enabled = value.enabled;
    scan();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.enabled) return;
    enabled = changes.enabled.newValue;
    if (enabled) scan();
    else document.querySelectorAll(`.${buttonClass}`).forEach((button) => button.remove());
  });
})();
