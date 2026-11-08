function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function verificationEmail({ name, link }) {
  return {
    subject: 'Confirme seu e-mail',
    text: `Olá, ${name}!\n\nConfirme seu e-mail acessando:\n${link}\n\nO link vale por 24 horas.`,
    html: `<p>Olá, ${escapeHtml(name)}!</p>
           <p><a href="${escapeHtml(link)}">Confirmar e-mail</a></p>
           <p>O link vale por 24 horas.</p>`,
  };
}
