import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';

const PG_CONN = process.env.PG_URI || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: PG_CONN,
  ssl: PG_CONN?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
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
    const { id } = (context?.params || {}) as { id: string };
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [userId]);
    if (!rows.length) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json(mapUserRow(rows[0]));
  } catch (error) {
    console.error('Erro ao buscar usuário por ID (PG):', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ message: 'Erro interno do servidor', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const { id } = (context?.params || {}) as { id: string };
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    // Soft delete
    const { rowCount } = await pool.query(`update public.users set is_active = false, updated_at = now() where id = $1`, [userId]);
    if (!rowCount) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover usuário (PG):', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ message: 'Erro interno do servidor', error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: any) {
  try {
    const { id } = (context?.params || {}) as { id: string };
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ message: 'ID de usuário inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { permissions } = body;

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ message: 'Permissões inválidas' }, { status: 400 });
    }

    // Update permissions
    const { rowCount } = await pool.query(`update public.users set permissions = $1, updated_at = now() where id = $2`, [JSON.stringify(permissions), userId]);
    if (!rowCount) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
    }

    // Return updated user
    const { rows } = await pool.query(`select * from public.users where id = $1 limit 1`, [userId]);
    return NextResponse.json(mapUserRow(rows[0]));
  } catch (error) {
    console.error('Erro ao atualizar permissões do usuário (PG):', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ message: 'Erro interno do servidor', error: errorMessage }, { status: 500 });
  }
}
