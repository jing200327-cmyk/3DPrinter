/* 同一标签页内保留设备顺序。首次配网演示有独立的空列表。 */
const printerCatalog = (() => {
  const empty = new URLSearchParams(location.search).get('myPrinters') === 'empty';
  const key = 'funbox-printers-v1-' + (empty ? 'pairing' : 'workbench');
  const day = 86400000;
  const now = Date.now();
  let printers = empty ? [] : [
    { id: 'funbox-1', name: 'Ugee Funbox(1)', status: null, connectedAt: now },
    { id: 'funbox', name: 'Ugee Funbox', status: 'idle', connectedAt: now - day },
    { id: 'ufun', name: 'Ugee Ufun', status: 'busy', connectedAt: now - 2 * day }
  ];
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (Array.isArray(saved)) printers = saved;
  } catch { /* 存储不可用时仍可在当前页面演示。 */ }
  function save() {
    try { sessionStorage.setItem(key, JSON.stringify(printers)); } catch {}
  }
  function nextName() {
    const names = new Set(printers.map(printer => printer.name));
    let name = 'Ugee Funbox';
    for (let i = 1; names.has(name); i++) name = 'Ugee Funbox(' + i + ')';
    return name;
  }
  return {
    get all() { return printers; },
    get current() { return printers[0]; },
    connect(id) {
      let printer = printers.find(item => item.id === id);
      if (!printer) printer = { id, name: nextName(), status: 'idle' };
      printer.connectedAt = Math.max(Date.now(), (printers[0]?.connectedAt || 0) + 1);
      printers = [printer, ...printers.filter(item => item.id !== id)];
      save();
    },
    removeCurrent() { printers.shift(); save(); },
    setStatus(status) { if (printers[0]) { printers[0].status = status; save(); } }
  };
})();
