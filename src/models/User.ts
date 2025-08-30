import mongoose, { Schema, Document, models, model } from 'mongoose';

const PedidosPermissionsSchema = new Schema({
  visualizar: { type: Boolean, default: false },
  criar: { type: Boolean, default: false },
  editar: { type: Boolean, default: false },
}, { _id: false });

const PermissionsSchema = new Schema({
  dashboard: { type: Boolean, default: false },
  pedidos: { type: PedidosPermissionsSchema, default: () => ({}) },
  tabelaPrecos: { type: Boolean, default: false },
  calendar: { type: Boolean, default: false },
  usuarios: { type: Boolean, default: false },
  configuracoes: { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new Schema({
  name: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  company: { type: String },
  phone: { type: String },
  role: { type: String, default: 'user' },
  status: { type: String, default: 'Ativo' },
  isActive: { type: Boolean, default: true },
  avatar: { type: String },
  permissions: { type: PermissionsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Evita a recriação do modelo se ele já existir
const User = models.User || model('User', UserSchema);

export default User;
