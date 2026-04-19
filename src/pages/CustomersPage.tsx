import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const initialForm = {
  fname: '',
  lname: '',
  wapp: '',
  imsg: '',
  shippadd: '',
  zip: '',
};

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [incidents, setIncidents] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState<number | null>(null);
  const [incidentText, setIncidentText] = useState('');
  const [form, setForm] = useState(initialForm);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const userType = localStorage.getItem('userType') ?? '';

  useEffect(() => {
    fetchCustomers();
  }, [search, page, limit]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCustomers();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [search, page, limit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowViewModal(false);
        setShowEditModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchCustomers = async () => {
    // Request a very large limit so we get the full set from the backend
    // (some backends apply a default cap when no limit is provided).
    const { data } = await axios.get(`${API_URL}/api/customers`, {
      params: { search, limit: 1000000 }
    });
    const allCustomers = data.customers || [];
    setTotalCustomers(allCustomers.length);
    const start = (page - 1) * limit;
    const end = start + limit;
    setCustomers(allCustomers.slice(start, end));
  };

  const handleView = async (customer: any) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
    const { data } = await axios.get(`${API_URL}/api/customers/${customer.id}/incidents`);
    setIncidents(data.incidents);
  };

  const handleAddIncident = async () => {
    if (!incidentText.trim()) return;
    const userId = localStorage.getItem('userId'); // o de tu contexto de usuario
    await axios.post(`${API_URL}/api/customers/${selectedCustomer.id}/incidents`, {
      description: incidentText,
      user_init: userId
    });
    setIncidentText('');
    const { data } = await axios.get(`${API_URL}/api/customers/${selectedCustomer.id}/incidents`);
    setIncidents(data.incidents);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      await axios.put(`${API_URL}/api/customers/${editingCustomer.id}`, form);
    } else {
      await axios.post(`${API_URL}/api/customers`, form);
    }
    setForm(initialForm);
    setEditingCustomer(null);
    setShowEditModal(false);
    setSuccessMsg(editingCustomer ? 'Customer updated successfully!' : 'Customer created successfully!');
    setTimeout(() => setSuccessMsg(''), 2500);
    fetchCustomers();
  };

  const handleDelete = (id: number) => {
    setDeleteCustomerId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteCustomerId) return;
    try {
      await axios.delete(`${API_URL}/api/customers/${deleteCustomerId}`);
      setSuccessMsg('Customer deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchCustomers();
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      const errorMessage = err.response?.data?.error || 'Error deleting customer';
      setErrorMsg(errorMessage);
      setTimeout(() => setErrorMsg(''), 2500);
    }
    setShowDeleteModal(false);
    setDeleteCustomerId(null);
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setForm(customer);
    setShowEditModal(true);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {errorMsg}
        </div>
      )}

      <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-5xl mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-center">Customers</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => {
              setEditingCustomer(null);
              setForm(initialForm);
              setShowEditModal(true);
            }}
          >
            + New Customer
          </button>
        </div>
        {/* Buscador */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search customer by name, surname, WhatsApp, iMessage, address or ZIP"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-full"
          />
        </div>
        {/* Filtros y paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-auto">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
          </select>
        </div>
        {/* Listado de clientes */}
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded shadow min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">WhatsApp</th>
                <th className="p-2 text-left">iMessage</th>
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">ZIP</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: any) => (
                <tr key={customer.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2">{customer.fname} {customer.lname}</td>
                  <td className="p-2">{customer.wapp}</td>
                  <td className="p-2">{customer.imsg}</td>
                  <td className="p-2 max-w-[150px] truncate" title={customer.shippadd}>{customer.shippadd}</td>
                  <td className="p-2">{customer.zip}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => handleView(customer)}
                        title="View"
                      >
                        👁️
                      </button>
                      <button
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => handleEdit(customer)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {userType === '1' && (
                        <button
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                          onClick={() => handleDelete(customer.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Modal de detalles */}
        {showViewModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
            <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded shadow-lg w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowViewModal(false)}>×</button>
              <h2 className="text-xl font-bold mb-2">Customer Details #{selectedCustomer.id}</h2>
              <div className="space-y-2">
                <div><strong>First Name:</strong> {selectedCustomer.fname}</div>
                <div><strong>Last Name:</strong> {selectedCustomer.lname}</div>
                <div><strong>WhatsApp:</strong> {selectedCustomer.wapp}</div>
                <div><strong>iMessage:</strong> {selectedCustomer.imsg}</div>
                <div><strong>Shipping Address:</strong> {selectedCustomer.shippadd}</div>
                <div><strong>ZIP:</strong> {selectedCustomer.zip}</div>
              </div>
              <div className="mb-4">
                <strong>Incidents:</strong>
                <ul className="list-disc ml-6">
                  {incidents.map((inc: any) => (
                    <li key={inc.id}>{new Date(inc.dateincident).toLocaleString()}: {inc.description}</li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="New Incident..."
                    value={incidentText}
                    onChange={e => setIncidentText(e.target.value)}
                    className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-full"
                  />
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded"
                    onClick={handleAddIncident}
                  >
                    Add Incident
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for create/edit customer */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowEditModal(false)}>×</button>
              <h2 className="text-xl font-bold mb-4">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">First Name</label>
                  <input
                    type="text"
                    name="fname"
                    value={form.fname}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Last Name</label>
                  <input
                    type="text"
                    name="lname"
                    value={form.lname}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">WhatsApp</label>
                  <input
                    type="text"
                    name="wapp"
                    value={form.wapp}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">iMessage</label>
                  <input
                    type="text"
                    name="imsg"
                    value={form.imsg}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Shipping Address</label>
                  <input
                    type="text"
                    name="shippadd"
                    value={form.shippadd}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">ZIP</label>
                  <input
                    type="text"
                    name="zip"
                    value={form.zip}
                    onChange={handleFormChange}
                    className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                  {editingCustomer ? 'Update' : 'Create'} Customer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal for delete confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowDeleteModal(false)}>×</button>
              <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
              <p className="mb-4">Are you sure you want to delete this customer?</p>
              <div className="flex gap-2">
                <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >Prev</button>
          <span className="px-2">Page {page} of {Math.max(1, Math.ceil(totalCustomers / limit))}</span>
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={page >= Math.ceil(totalCustomers / limit)}
            onClick={() => setPage(page + 1)}
          >Next</button>
        </div>
      </div>
    </div>
  );
};

export default CustomersPage;