// ============================================================
// MarieU 회원가입 신청서 제출 처리 함수
// 브라우저 → 이 함수(서버) → Supabase
// 민감정보는 이 함수 안에서 AES-256-GCM으로 암호화한 뒤에만 DB로 전송됩니다.
// SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY는 Netlify 환경변수에만 존재하며
// 브라우저(클라이언트) 코드나 GitHub 저장소에는 절대 포함되지 않습니다.
// ============================================================

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function encryptPayload(plainTextJson, encryptionKeyHex) {
  // ENCRYPTION_KEY는 64자리 hex 문자열(32바이트)이어야 합니다.
  const key = Buffer.from(encryptionKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY는 32바이트(64자리 hex)여야 합니다.');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainTextJson, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv : authTag : ciphertext  (모두 base64, ':'로 구분)
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'POST 요청만 허용됩니다.' }) };
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY,
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ENCRYPTION_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '서버 환경변수(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ENCRYPTION_KEY)가 설정되지 않았습니다.' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: '잘못된 요청 형식입니다.' }) };
  }

  const name = (data.f_name || '').trim();
  const phone = (data.f_phone || '').trim();
  const email = (data.f_email || '').trim();

  if (!name || !phone || !email) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: '성명, 휴대폰, 이메일은 필수입니다.' }),
    };
  }

  let encryptedPayload;
  try {
    encryptedPayload = encryptPayload(JSON.stringify(data), ENCRYPTION_KEY);
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: '암호화 처리 중 오류: ' + e.message }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: inserted, error } = await supabase
    .from('applications')
    .insert([{ name, phone, email, encrypted_payload: encryptedPayload }])
    .select('id, created_at')
    .single();

  if (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'DB 저장 중 오류: ' + error.message }) };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ ok: true, id: inserted.id, created_at: inserted.created_at }),
  };
};
