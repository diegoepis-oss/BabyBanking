function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildTransactionsCsv(rows) {
  const header = ['Conto', 'Data', 'Tipo', 'Importo', 'Descrizione', 'Saldo dopo il movimento'];
  const lines = [header.map(csvEscape).join(',')];

  rows.forEach((r) => {
    lines.push(
      [
        r.accountName,
        new Date(r.date).toLocaleDateString('it-IT'),
        r.type === 'deposit' ? 'Deposito' : 'Prelievo',
        r.amount.toFixed(2),
        r.description,
        r.balanceAfter.toFixed(2),
      ]
        .map(csvEscape)
        .join(',')
    );
  });

  return lines.join('\n');
}

module.exports = { buildTransactionsCsv };
