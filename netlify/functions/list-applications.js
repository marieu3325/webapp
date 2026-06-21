// ============================================================
// 관리자용: 제출된 신청서 목록을 복호화하여 조회하는 함수
// 헤더 x-admin-password 가 Netlify 환경변수 ADMIN_PASSWORD 와 일치해야만 동작합니다.
// ============================================================

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function decryptPayload(encryptedString, encryptionKeyHex) {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const [ivB64, authTagB64, dataB64] = encryptedString.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY,
    ADMIN_PASSWORD,
  } = process.env;

  if (!ADMIN_PASSWORD) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' }) };
  }

  const providedPassword = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!providedPassword || providedPassword !== ADMIN_PASSWORD) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: '관리자 비밀번호가 올바르지 않습니다.' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: rows, error } = await supabase
    .from('applications')
    .select('id, created_at, name, phone, email, encrypted_payload')
    .order('created_at', { ascending: false });

  if (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: '조회 중 오류: ' + error.message }) };
  }

  const results = rows.map((row) => {
    let detail = null;
    let decryptError = null;
    try {
      detail = decryptPayload(row.encrypted_payload, ENCRYPTION_KEY);
    } catch (e) {
      decryptError = '복호화 실패: ' + e.message;
    }
    return {
      id: row.id,
      created_at: row.created_at,
      name: row.name,
      phone: row.phone,
      email: row.email,
      detail,
      decryptError,
    };
  });

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ ok: true, count: results.length, applications: results }),
  };
};
