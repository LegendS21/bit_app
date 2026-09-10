'use strict';

/**
 * Kunci RS256 untuk access token.
 *
 * Dipakai RS256 (bukan HS256) supaya API Gateway dan service lain bisa
 * memverifikasi token secara lokal pakai public key dari /.well-known/jwks.json,
 * tanpa perlu tahu kunci rahasia service RBAC.
 *
 * Kalau file kunci belum ada, pasangan kunci dibuat otomatis saat boot pertama.
 * Di produksi pasang file kunci sendiri (mis. lewat Docker secret) dan jangan
 * mengandalkan hasil generate otomatis — kalau container di-recreate tanpa
 * volume, kuncinya berubah dan semua access token yang beredar jadi invalid.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRIVATE_KEY_PATH = tentukanPath(process.env.JWT_PRIVATE_KEY_PATH || './keys/jwt-private.pem');
const PUBLIC_KEY_PATH = tentukanPath(process.env.JWT_PUBLIC_KEY_PATH || './keys/jwt-public.pem');

function tentukanPath(lokasi) {
  return path.isAbsolute(lokasi) ? lokasi : path.resolve(__dirname, '..', lokasi);
}

function buatPasanganKunci() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });

  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

  fs.mkdirSync(path.dirname(PRIVATE_KEY_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(PUBLIC_KEY_PATH), { recursive: true });
  // mode 0600 — private key hanya boleh dibaca pemilik prosesnya.
  fs.writeFileSync(PRIVATE_KEY_PATH, privatePem, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicPem, { mode: 0o644 });

  console.log(`🔑 Pasangan kunci RS256 dibuat di ${path.dirname(PRIVATE_KEY_PATH)}`);
  return { privatePem, publicPem };
}

function muatKunci() {
  const adaPrivate = fs.existsSync(PRIVATE_KEY_PATH);
  const adaPublic = fs.existsSync(PUBLIC_KEY_PATH);

  if (adaPrivate && adaPublic) {
    return {
      privatePem: fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      publicPem: fs.readFileSync(PUBLIC_KEY_PATH, 'utf8')
    };
  }

  if (adaPrivate !== adaPublic) {
    throw new Error(
      'Kunci JWT tidak lengkap: hanya salah satu dari private/public key yang ada. ' +
      'Hapus keduanya agar dibuat ulang, atau lengkapi file yang hilang.'
    );
  }

  return buatPasanganKunci();
}

const { privatePem, publicPem } = muatKunci();

const privateKey = crypto.createPrivateKey(privatePem);
const publicKey = crypto.createPublicKey(publicPem);

/**
 * kid = thumbprint JWK sesuai RFC 7638. Dipasang di header JWT supaya
 * verifier bisa memilih kunci yang tepat waktu nanti ada rotasi kunci.
 */
function hitungKid(jwk) {
  const kanonik = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return crypto.createHash('sha256').update(kanonik).digest('base64url');
}

const publicJwk = publicKey.export({ format: 'jwk' });
const kid = hitungKid(publicJwk);

/** Isi endpoint GET /.well-known/jwks.json */
function jwks() {
  return {
    keys: [
      {
        kty: publicJwk.kty,
        n: publicJwk.n,
        e: publicJwk.e,
        alg: 'RS256',
        use: 'sig',
        kid
      }
    ]
  };
}

module.exports = { privateKey, publicKey, privatePem, publicPem, kid, jwks };
