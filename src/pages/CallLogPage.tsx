import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const initialCall = {
  callNroTel: '',
  callNameSender: '',
  callDescription: '',
  isClaim: 0,
};

// Helper to format various date inputs to YYYY-MM-DD
function formatDateToYMD(value: any): string {
  if (!value) return '';
  const s = String(value);
  // If string already contains YYYY-MM-DD, return that
  const match = s.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  // Try to parse as date
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const CallLogPage: React.FC = () => {
  const [calls, setCalls] = useState([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [callSearch, setCallSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterIsClaim, setFilterIsClaim] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCallModal, setShowCallModal] = useState(false);
  const [editingCall, setEditingCall] = useState<any>(null);
  const [callForm, setCallForm] = useState(initialCall);
  const [successMsg, setSuccessMsg] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCallId, setDeleteCallId] = useState<number | null>(null);

  const userId = localStorage.getItem('userId') ?? '';
  const userType = localStorage.getItem('userType') ?? '';

  const fetchCalls = async () => {
    const params: any = {
      search: callSearch,
      page: currentPage,
      date_from: filterDateFrom,
      date_to: filterDateTo,
      is_claim: filterIsClaim,
      limit: recordsPerPage
    };
    try {
      const { data } = await axios.get(`${API_URL}/api/calls`, { params });
      setCalls(data.calls);
      setTotalCalls(data.total || data.calls.length);
    } catch (err) {
      console.error('Error fetching calls:', err);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [callSearch, filterDateFrom, filterDateTo, filterIsClaim, currentPage, recordsPerPage]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalls();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [callSearch, filterDateFrom, filterDateTo, filterIsClaim, currentPage, recordsPerPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowViewModal(false);
        setShowCallModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCallForm({
      ...callForm,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked ? 1 : 0 : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCall) {
        await axios.put(`${API_URL}/api/calls/${editingCall.id}`, { ...callForm, idUser: userId });
      } else {
        await axios.post(`${API_URL}/api/calls`, { ...callForm, idUser: userId });
      }
      setCallForm(initialCall);
      setEditingCall(null);
      setShowCallModal(false);
      setSuccessMsg(editingCall ? 'Call updated successfully!' : 'Call registered successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchCalls();
    } catch (err) {
      console.error('Error saving call:', err);
    }
  };

  const handleEdit = (call: any) => {
    setEditingCall(call);
    setCallForm({
      callNroTel: call.callNroTel || '',
      callNameSender: call.callNameSender || '',
      callDescription: call.callDescription,
      isClaim: call.isClaim,
    });
    setShowCallModal(true);
  };

  const handleView = (call: any) => {
    setSelectedCall(call);
    setShowViewModal(true);
  };

  const handleDelete = (id: number) => {
    setDeleteCallId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteCallId) return;
    try {
      await axios.delete(`${API_URL}/api/calls/${deleteCallId}`);
      setSuccessMsg('Call deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchCalls();
    } catch (err) {
      console.error('Error deleting call:', err);
    }
    setShowDeleteModal(false);
    setDeleteCallId(null);
  };

  const handleResetFilters = () => {
    setCallSearch('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterIsClaim('');
    setCurrentPage(1);
    setRecordsPerPage(10);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {successMsg}
        </div>
      )}

      <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-6xl mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-center">Call Log</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => {
              setEditingCall(null);
              setCallForm(initialCall);
              setShowCallModal(true);
            }}
          >
            + New Call
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between gap-2 md:gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <h2 className="text-xl font-bold">Call List</h2>
            <input
              type="text"
              value={callSearch}
              onChange={e => setCallSearch(e.target.value)}
              placeholder="Search by phone, name, description"
              className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-sm">From:</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="p-2 rounded border min-h-[44px]" />
            </div>
            <div className="flex flex-col">
              <label className="text-sm">To:</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="p-2 rounded border min-h-[44px]" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-sm">All Types</label>
              <select value={filterIsClaim} onChange={e => setFilterIsClaim(e.target.value)} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">All Types</option>
                <option value="1">Claim</option>
                <option value="0">Regular</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm">Records:</label>
              <select value={recordsPerPage} onChange={e => { setRecordsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <button onClick={handleResetFilters} className="flex items-center p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 min-h-[44px]" title="Reset Filters">
              ↻ Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white dark:bg-gray-900 rounded shadow">
            <thead>
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Time</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Name</th>
                <th className="p-2">Description</th>
                <th className="p-2">User</th>
                <th className="p-2">Type</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">No calls found.</td></tr>
              ) : (
                calls.map((call: any) => (
                  <tr key={call.id} className={call.isClaim ? 'bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg' : ''}>
                    <td className="p-2">{formatDateToYMD(call.callDate)}</td>
                    <td className="p-2">{formatDateToYMD(call.callTime) || call.callTime}</td>
                    <td className="p-2">{call.callNroTel}</td>
                    <td className="p-2">{call.callNameSender}</td>
                    <td className="p-2">{call.callDescription}</td>
                    <td className="p-2">{call.user_fname} {call.user_lname}</td>
                    <td className="p-2">{call.isClaim ? 'Claim' : 'Regular'}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => handleView(call)}
                        title="View"
                      >
                        👁️
                      </button>
                      <button
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => handleEdit(call)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {userType !== '2' && (
                        <button
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                          onClick={() => handleDelete(call.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >Prev</button>
          <span className="px-2">Page {currentPage} of {Math.max(1, Math.ceil(totalCalls / recordsPerPage))}</span>
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={currentPage >= Math.ceil(totalCalls / recordsPerPage)}
            onClick={() => setCurrentPage(currentPage + 1)}
          >Next</button>
        </div>
      </div>

      {/* Modal for view call */}
      {showViewModal && selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowViewModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">Call Details</h2>
            <div className="space-y-2">
              <div><strong>Date:</strong> {formatDateToYMD(selectedCall.callDate)}</div>
              <div><strong>Time:</strong> {selectedCall.callTime}</div>
              <div><strong>Phone:</strong> {selectedCall.callNroTel}</div>
              <div><strong>Name:</strong> {selectedCall.callNameSender}</div>
              <div><strong>Description:</strong> {selectedCall.callDescription}</div>
              <div><strong>User:</strong> {selectedCall.user_fname} {selectedCall.user_lname}</div>
              <div><strong>Type:</strong> {selectedCall.isClaim ? 'Claim' : 'Regular'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for create/edit call */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowCallModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowCallModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">{editingCall ? 'Edit Call' : 'New Call'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Phone Number</label>
                <input
                  type="text"
                  name="callNroTel"
                  value={callForm.callNroTel}
                  onChange={handleFormChange}
                  className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Sender Name</label>
                <input
                  type="text"
                  name="callNameSender"
                  value={callForm.callNameSender}
                  onChange={handleFormChange}
                  className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea
                  name="callDescription"
                  value={callForm.callDescription}
                  onChange={handleFormChange}
                  className="w-full p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isClaim"
                    checked={callForm.isClaim === 1}
                    onChange={handleFormChange}
                  />
                  Is it a Claim?
                </label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                {editingCall ? 'Update' : 'Register'} Call
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
            <p className="mb-4">Are you sure you want to delete this call?</p>
            <div className="flex gap-2">
              <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogPage;