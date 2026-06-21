// ============================================================
// 관리자용: 준회원(문의했지만 미등록) 리스트 조회
// 헤더 x-admin-password 가 Netlify 환경변수 ADMIN_PASSWORD 와 일치해야 동작합니다.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_PASSWORD) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.' }) };
  }

  const providedPassword = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!providedPassword || providedPassword !== ADMIN_PASSWORD) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: '관리자 비밀번호가 올바르지 않습니다.' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: rows, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: '조회 중 오류: ' + error.message }) };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ ok: true, count: rows.length, prospects: rows }),
  };
};
