// ============================================================
// 관리자용: 준회원 추가 / 수정
// body에 id가 있으면 수정, 없으면 새로 추가합니다.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'POST 요청만 허용됩니다.' }) };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_PASSWORD) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' }) };
  }
  const providedPassword = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!providedPassword || providedPassword !== ADMIN_PASSWORD) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: '관리자 비밀번호가 올바르지 않습니다.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: '잘못된 요청 형식입니다.' }) };
  }

  const { id, name, phone, gender, age, region, job, note } = body;
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: '이름은 필수입니다.' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const record = {
    name: trimmedName,
    phone: (phone || '').trim(),
    gender: (gender || '').trim(),
    age: (age || '').trim(),
    region: (region || '').trim(),
    job: (job || '').trim(),
    note: (note || '').trim(),
    updated_at: new Date().toISOString(),
  };

  let result;
  if (id) {
    result = await supabase.from('prospects').update(record).eq('id', id).select().single();
  } else {
    result = await supabase.from('prospects').insert([record]).select().single();
  }

  if (result.error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'DB 저장 중 오류: ' + result.error.message }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, prospect: result.data }) };
};
