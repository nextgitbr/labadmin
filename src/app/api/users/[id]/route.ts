import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';
import '@/lib/sslFix'; // Aplicar correção SSL global
import { logAppError } from '@/lib/logError';

// Postgres pool com fallbacks e SSL condicional
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

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieves a single user's data based on their ID.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User data retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID format.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 *   delete:
 *     summary: Delete a user by ID
 *     description: Soft delete a user by ID.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       400:
 *         description: Invalid user ID format.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
export async function GET(request: NextRequest, context: any) {
  try {
    console.log('🔍 Buscando usuário por ID...');
    console.log('🔗 Conexão PostgreSQL:', PG_CONN ? '[CONFIGURADA]' : '[NÃO CONFIGURADA]');
    
    const params = await context?.params;
    const { id } = (params || {}) as { id: string };
    console.log('📋 ID recebido:', id);
    
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      console.error('❌ ID de usuário inválido:', id);
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    console.log('🔢 ID numérico:', userId);
    console.log('💾 Executando query...');
    
    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [userId]);
    
    console.log('📊 Resultado da query:', { rowCount: rows.length });
    
    if (!rows.length) {
      console.warn('⚠️ Usuário não encontrado:', userId);
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    
    const user = mapUserRow(rows[0]);
    console.log('✅ Usuário encontrado:', { id: user.id, email: user.email, name: user.name });
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('❌ Erro ao buscar usuário por ID (PG):', error);
    console.error('❌ Stack trace:', error?.stack);
    console.error('❌ Código do erro:', error?.code);
    console.error('❌ Endereço:', error?.address);
    console.error('❌ Porta:', error?.port);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await logAppError('users/[id] GET failed', 'error', { message: errorMessage, code: error?.code });
    return NextResponse.json({ 
      message: 'Erro interno do servidor', 
      error: errorMessage,
      code: error?.code,
      details: `Falha na conexão PostgreSQL: ${error?.address}:${error?.port}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    console.log('🗑️ Removendo usuário...');
    console.log('🔗 Conexão PostgreSQL:', PG_CONN ? '[CONFIGURADA]' : '[NÃO CONFIGURADA]');
    
    const params = await context?.params;
    const { id } = (params || {}) as { id: string };
    console.log('📋 ID recebido:', id);
    
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      console.error('❌ ID de usuário inválido:', id);
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    console.log('🔢 ID numérico:', userId);
    console.log('💾 Executando soft delete...');

    // Soft delete
    const { rowCount } = await pool.query(`update public.users set is_active = false, updated_at = now() where id = $1`, [userId]);
    
    console.log('📊 Linhas afetadas:', rowCount);
    
    if (!rowCount) {
      console.warn('⚠️ Usuário não encontrado para remoção:', userId);
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    
    console.log('✅ Usuário removido com sucesso:', userId);
    return NextResponse.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao remover usuário (PG):', error);
    console.error('❌ Stack trace:', error?.stack);
    console.error('❌ Código do erro:', error?.code);
    console.error('❌ Endereço:', error?.address);
    console.error('❌ Porta:', error?.port);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await logAppError('users/[id] DELETE failed', 'error', { message: errorMessage, code: error?.code });
    return NextResponse.json({ 
      message: 'Erro interno do servidor', 
      error: errorMessage,
      code: error?.code,
      details: `Falha na conexão PostgreSQL: ${error?.address}:${error?.port}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: any) {
  try {
    console.log('✏️ Atualizando permissões do usuário...');
    console.log('🔗 Conexão PostgreSQL:', PG_CONN ? '[CONFIGURADA]' : '[NÃO CONFIGURADA]');
    
    const params = await context?.params;
    const { id } = (params || {}) as { id: string };
    console.log('📋 ID recebido:', id);
    
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      console.error('❌ ID de usuário inválido:', id);
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    console.log('🔢 ID numérico:', userId);
    
    const body = await request.json();
    const { permissions } = body;
    
    console.log('📝 Permissões recebidas:', permissions);

    if (!permissions || typeof permissions !== 'object') {
      console.error('❌ Permissões inválidas:', permissions);
      return NextResponse.json({ message: 'Permissões inválidas' }, { status: 400 });
    }

    console.log('💾 Executando update de permissões...');

    // Update permissions
    const { rowCount } = await pool.query(`update public.users set permissions = $1, updated_at = now() where id = $2`, [JSON.stringify(permissions), userId]);
    
    console.log('📊 Linhas afetadas:', rowCount);
    
    if (!rowCount) {
      console.warn('⚠️ Usuário não encontrado para atualização:', userId);
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    console.log('🔍 Buscando usuário atualizado...');

    // Return updated user
    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [userId]);
    const user = mapUserRow(rows[0]);
    
    console.log('✅ Permissões atualizadas com sucesso:', { id: user.id, email: user.email });
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar permissões do usuário (PG):', error);
    console.error('❌ Stack trace:', error?.stack);
    console.error('❌ Código do erro:', error?.code);
    console.error('❌ Endereço:', error?.address);
    console.error('❌ Porta:', error?.port);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await logAppError('users/[id] PUT failed', 'error', { message: errorMessage, code: error?.code });
    return NextResponse.json({ 
      message: 'Erro interno do servidor', 
      error: errorMessage,
      code: error?.code,
      details: `Falha na conexão PostgreSQL: ${error?.address}:${error?.port}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
