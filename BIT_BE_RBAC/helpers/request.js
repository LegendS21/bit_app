'use strict';

/**
 * Jejak asal request untuk audit_log dan refresh_tokens.
 * Dipotong sesuai panjang kolom di DB supaya user agent panjang
 * tidak bikin insert-nya gagal.
 */
function ambilMeta(req) {
  return {
    ip_address: (req.ip || '').slice(0, 45) || null,
    user_agent: (req.get('user-agent') || '').slice(0, 255) || null
  };
}

module.exports = { ambilMeta };
