import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verifyPassword } from '@/lib/crypto';
import { generateToken } from '@/lib/jwt';
import { requireSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PG pool
const PG_CONN =
  process.env.PG_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: /supabase\.(co|com)/.test(PG_CONN || '') || /sslmode=require/i.test(PG_CONN || '')
    ? { rejectUnauthorized: false }
    : undefined,
});

function mapUserRow(row: any) {
  return {
    _id: String(row.id),
    id: row.id,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || '',
    company: row.company || '',
    permissions: row.permissions || {},
    country: row.country || '',
    city: row.city || '',
    zip: row.zip || '',
    vat: row.vat || '',
    avatar: row.avatar || '/images/avatars/01.png',
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!PG_CONN) {
      console.error('[LOGIN] Sem conexão de banco. Defina POSTGRES_URL/POSTGRES_PRISMA_URL/POSTGRES_URL_NON_POOLING ou DATABASE_URL/PG_URI');
      return NextResponse.json({ error: 'Configuração de banco ausente' }, { status: 500 });
    }
    
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    console.log('[LOGIN] Tentando autenticar', { email });
    
    let user;
    try {
      const query = `
        SELECT * 
        FROM public.users 
        WHERE LOWER(email) = LOWER($1) 
        LIMIT 1
      `;
      const result = await pool.query(query, [email.trim().toLowerCase()]);
      user = result.rows[0];
    } catch (error: any) {
      console.error('[LOGIN] Erro ao buscar usuário:', error?.message || error);
      return NextResponse.json(
        { error: 'Erro ao processar a autenticação' }, 
        { status: 500 }
      );
    }

    if (!user) {
      console.warn('[LOGIN] Usuário não encontrado');
      return NextResponse.json(
        { error: 'Credenciais inválidas' }, 
        { status: 401 }
      );
    }

    // Verificar senha
    if (!user.password || !verifyPassword(password, user.password)) {
      console.warn('[LOGIN] Senha inválida');
      return NextResponse.json(
        { error: 'Credenciais inválidas' }, 
        { status: 401 }
      );
    }

    // Verificar se o usuário está ativo
    if (user.is_active === false) {
      console.warn('[LOGIN] Usuário inativo');
      return NextResponse.json(
        { error: 'Esta conta está desativada' }, 
        { status: 403 }
      );
    }

    // Tentar sincronizar com Supabase Auth se necessário
    console.log('[LOGIN] Verificando sincronização com Supabase Auth...');
    try {
      const supabase = requireSupabaseAdmin();
      const { data: existingUser } = await supabase.auth.admin.getUserById(user.auth_user_id || user.id);
      
      if (!existingUser.user) {
        console.log('[LOGIN] Usuário não encontrado no Supabase Auth, tentando sincronizar...');
        // Tentar criar usuário no Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: user.email,
          password: password, // Usar a senha fornecida
          options: {
            data: {
              synced_from_postgres: true,
              postgres_user_id: user.id
            }
          }
        });

        if (signUpError && signUpError.message !== 'User already registered') {
          console.error('[LOGIN] Erro ao sincronizar usuário:', signUpError.message);
        } else if (signUpData.user) {
          console.log('[LOGIN] Usuário sincronizado com Supabase Auth:', signUpData.user.id);
          
          // Atualizar auth_user_id no Postgres se necessário
          if (!user.auth_user_id) {
            await pool.query(
              'UPDATE public.users SET auth_user_id = $1 WHERE id = $2',
              [signUpData.user.id, user.id]
            );
            console.log('[LOGIN] auth_user_id atualizado no Postgres');
          }

          // Confirmar email automaticamente para desenvolvimento
          if (!signUpData.user.email_confirmed_at) {
            const { error: confirmError } = await supabase.auth.admin.updateUserById(
              signUpData.user.id,
              { email_confirm: true }
            );
            if (confirmError) {
              console.warn('[LOGIN] Não foi possível confirmar email automaticamente:', confirmError.message);
            } else {
              console.log('[LOGIN] Email confirmado automaticamente');
            }
          }
        }
      }
    } catch (syncError: any) {
      console.warn('[LOGIN] Aviso: erro na sincronização com Supabase Auth (continuando com JWT):', syncError.message);
      // Não bloquear o login se a sincronização falhar
    }

    // Mapear dados do usuário para retorno
    const userData = mapUserRow(user);
    
    // Gerar token JWT
    const token = generateToken({
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions
    });

    console.log('[LOGIN] Autenticação bem-sucedida', { 
      id: userData.id, 
      email: userData.email,
      role: userData.role
    });
    
    // Retornar dados do usuário e token JWT
    return NextResponse.json({ 
      user: userData, 
      token,
      expiresIn: '7d' // Informar ao cliente quando o token expira
    }, { 
      status: 200,
      headers: {
        'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      }
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    );
  }
}
