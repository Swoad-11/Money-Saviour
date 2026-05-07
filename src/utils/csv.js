export function exportToCSV({ income, expenses, savingPct, currency, history }) {
  const rows = [];

  rows.push(['Money Saviour — Export', new Date().toLocaleDateString()]);
  rows.push([]);

  rows.push(['=== CURRENT BUDGET ===']);
  rows.push(['Income', income, currency]);
  rows.push([]);
  rows.push(['Category', 'Amount', 'Currency', 'Recurring', 'Frequency']);
  expenses.forEach(e => {
    rows.push([e.name, e.amount, currency, e.recurring ? 'Yes' : 'No', e.recurring ? e.frequency : '—']);
  });
  rows.push([]);

  const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const balance = (parseFloat(income) || 0) - totalExp;
  const saving = balance * (savingPct / 100);

  rows.push(['Total Expenses', totalExp.toFixed(2), currency]);
  rows.push(['Balance After Expenses', balance.toFixed(2), currency]);
  rows.push(['Savings Target %', savingPct + '%']);
  rows.push(['Monthly Savings', saving.toFixed(2), currency]);
  rows.push(['Remaining After Savings', (balance - saving).toFixed(2), currency]);
  rows.push([]);

  if (history.length > 0) {
    rows.push(['=== MONTHLY HISTORY ===']);
    rows.push(['Month', 'Income', 'Total Expenses', 'Savings', 'Currency']);
    history.forEach(h => {
      rows.push([h.label, h.income, h.totalExp, h.saving, h.currency || currency]);
    });
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `money-saviour-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
