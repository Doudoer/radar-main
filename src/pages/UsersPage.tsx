import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const initialForm = {
  email: '',
  pass: '',
  fname: '',
  lname: '',
  telws: '',
  telimsg: '',
  role: '',
  theme: 0,
};

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [successMsg, setSuccessMsg] = useState('');
  // Obtener tipo de usuario desde localStorage
  const userType = localStorage.getItem('userType');
  // Sólo SAdmin puede ver la página
  if (userType !== '1') return null;

  useEffect(() => {
    fetchUsers();
  }, [search, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchUsers = async () => {
    const { data } = await axios.get(`${API_URL}/api/users`, {
      params: { search, page, limit }
    });
    setUsers(data.users || []);
    setTotalUsers(data.total || 0);
  };

  const handleView = (user: any) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API_URL}/api/users/${editingUser.id}`, form);
      } else {
        await axios.post(`${API_URL}/api/users`, form);
      }
      setForm(initialForm);
      setEditingUser(null);
      setShowEditModal(false);
      setSuccessMsg(editingUser ? 'User updated successfully!' : 'User created successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteUserId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;
    try {
      await axios.delete(`${API_URL}/api/users/${deleteUserId}`);
      setSuccessMsg('User deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
    setShowDeleteModal(false);
    setDeleteUserId(null);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setForm({
      email: user.email || '',
      pass: '',
      fname: user.fname || '',
      lname: user.lname || '',
      telws: user.telws || '',
      telimsg: user.telimsg || '',
      role: user.role || '',
      theme: user.theme ?? 0,
    });
    setShowEditModal(true);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {successMsg}
        </div>
      )}

      <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-5xl mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-center">Users</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => {
              setEditingUser(null);
              setForm(initialForm);
              setShowEditModal(true);
            }}
          >
            + New User
          </button>
        </div>
        {/* Buscador */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Buscar usuario por nombre, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-full"
          />
        </div>
        {/* Filtros y paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-auto">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100">Prev</button>
            <span className="px-2">Página {page}</span>
            <button onClick={() => setPage(page + 1)} className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100">Next</button>
          </div>
        </div>
        {/* Listado de usuarios */}
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded shadow min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Theme</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2">{user.fname} {user.lname}</td>
                  <td className="p-2 max-w-[200px] truncate" title={user.email}>{user.email}</td>
                  <td className="p-2">{user.role === '1' ? 'SAdmin' : user.role === '2' ? 'Operator' : 'Admin'}</td>
                  <td className="p-2">{user.telws || user.telimsg}</td>
                  <td className="p-2">{user.theme === 1 ? 'Dark' : 'Light'}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => handleView(user)}
                        title="View"
                      >
                        👁️
                      </button>
                      <button
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                        onClick={() => handleDelete(user.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >Prev</button>
          <span className="px-2">Page {page} of {Math.max(1, Math.ceil(totalUsers / limit))}</span>
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={page >= Math.ceil(totalUsers / limit)}
            onClick={() => setPage(page + 1)}
          >Next</button>
        </div>
      </div>

      {/* Modal de detalles */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded shadow-lg w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowViewModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-2">User Details</h2>
            <div className="space-y-2">
              <div><strong>Name:</strong> {selectedUser.fname} {selectedUser.lname}</div>
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>Role:</strong> {selectedUser.role === '1' ? 'SAdmin' : selectedUser.role === '2' ? 'Operator' : 'Admin'}</div>
              <div><strong>WhatsApp:</strong> {selectedUser.telws}</div>
              <div><strong>iMessage:</strong> {selectedUser.telimsg}</div>
              <div><strong>Theme:</strong> {selectedUser.theme === 1 ? 'Dark' : 'Light'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded shadow-lg w-full max-w-lg relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowEditModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'New User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  name="fname"
                  value={form.fname}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  name="lname"
                  value={form.lname}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="pass"
                  value={form.pass}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="1">Sys Admin</option>
                  <option value="2">Operator</option>
                  <option value="3">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp</label>
                <input
                  type="text"
                  name="telws"
                  value={form.telws}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">iMessage</label>
                <input
                  type="text"
                  name="telimsg"
                  value={form.telimsg}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <select
                  name="theme"
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: Number(e.target.value) })}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value={0}>Light</option>
                  <option value={1}>Dark</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Save</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); setForm(initialForm); }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Delete</button>
              <button onClick={() => setShowDeleteModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;