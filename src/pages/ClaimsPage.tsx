import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { FaPlus, FaSearch, FaList, FaEdit, FaEye } from 'react-icons/fa';
import OrderDataSheet from '../components/OrderDataSheet';

interface Claim {
    id: number;
    order_id: number;
    order_code: string;
    fname: string;
    lname: string;
    status: string;
    attendant: string;
    created_at: string;
    updated_at: string;
    claim_description: string;
}

const ClaimsPage: React.FC = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [totalClaims, setTotalClaims] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Create Claim State
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orderSearch, setOrderSearch] = useState('');
    const [foundOrders, setFoundOrders] = useState<any[]>([]);
    const [newClaimDescription, setNewClaimDescription] = useState('');
    const [searchingOrders, setSearchingOrders] = useState(false);
    const [showOrderDataModal, setShowOrderDataModal] = useState(false);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loadingRecentOrders, setLoadingRecentOrders] = useState(false);

    // Status Update State
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [statusDescription, setStatusDescription] = useState('');

    // Values for Status Options
    const CLAIM_STATUS_OPTIONS = [
        'Claims Filed',
        'In Progress',
        'Pending Customer Info',
        'Resolved',
        'Rejected',
        'Closed'
    ];

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/claims`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    search,
                    status: statusFilter,
                    page,
                    limit: 10
                }
            });
            setClaims(data.claims);
            setTotalClaims(data.total);
        } catch (err) {
            console.error('Error fetching claims:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClaims();
    }, [search, statusFilter, page]);

    // Search Orders for creating new claim
    useEffect(() => {
        if (orderSearch.length < 3) {
            setFoundOrders([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingOrders(true);
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API_URL}/api/orders`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { search: orderSearch, limit: 10 } // Assuming orders API supports search
                });
                setFoundOrders(data.orders || []);
            } catch (err) {
                console.error('Error searching orders:', err);
            }
            setSearchingOrders(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [orderSearch]);

    const handleCreateClaim = async () => {
        if (!selectedOrder) return;
        try {
            const token = localStorage.getItem('token');
            const userName = localStorage.getItem('userName') || 'Unknown';
            await axios.post(`${API_URL}/api/claims`, {
                order_id: selectedOrder.id,
                description: newClaimDescription,
                attendant: userName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddModal(false);
            setNewClaimDescription('');
            setSelectedOrder(null);
            setOrderSearch('');
            fetchClaims();
        } catch (err) {
            console.error('Error creating claim:', err);
            alert('Failed to create claim');
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedClaim || !newStatus) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/claims/${selectedClaim.id}/status`, {
                status: newStatus,
                description: statusDescription
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowStatusModal(false);
            setNewStatus('');
            setStatusDescription('');
            fetchClaims();
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status');
        }
    };

    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const handleViewClaim = async (claim: Claim) => {
        setSelectedClaim(claim);
        setShowDetailModal(true);
        // Fetch History
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/claims/${claim.id}/status-history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatusHistory(data.history);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRecentOrders = async () => {
        setLoadingRecentOrders(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/orders`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 20 }
            });
            setRecentOrders(data.orders || []);
        } catch (err) {
            console.error('Error fetching recent orders:', err);
        }
        setLoadingRecentOrders(false);
    };

    const handleOpenOrderList = () => {
        setShowOrderDataModal(true);
        fetchRecentOrders();
    };



    // States for viewing full Order Data Sheet
    const [showOrderSheetModal, setShowOrderSheetModal] = useState(false);
    const [viewOrderData, setViewOrderData] = useState<any>(null);
    const [viewOrderAttachments, setViewOrderAttachments] = useState<any[]>([]);

    const handleViewOrderDetails = async () => {
        if (!selectedClaim) return;
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/orders/${selectedClaim.order_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setViewOrderData(data.order);
            // Fetch attachments
            const attRes = await axios.get(`${API_URL}/api/orders/${selectedClaim.order_id}/attachments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setViewOrderAttachments(attRes.data.files || []);

            setShowOrderSheetModal(true);
        } catch (err) {
            console.error('Error fetching order details:', err);
            alert('Failed to load order details');
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-0">Claims Management</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
                    >
                        <FaPlus />
                        <span>New Claim</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search order, customer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">All Statuses</option>
                        {CLAIM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    <th className="p-4 font-semibold uppercase text-sm">ID</th>
                                    <th className="p-4 font-semibold uppercase text-sm">Order</th>
                                    <th className="p-4 font-semibold uppercase text-sm">Customer</th>
                                    <th className="p-4 font-semibold uppercase text-sm">Status</th>
                                    <th className="p-4 font-semibold uppercase text-sm">Attendant</th>
                                    <th className="p-4 font-semibold uppercase text-sm">Updated</th>
                                    <th className="p-4 font-semibold uppercase text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {claims.map(claim => (
                                    <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                        <td className="p-4 text-gray-800 dark:text-gray-200">#{claim.id}</td>
                                        <td className="p-4 font-medium text-blue-600 dark:text-blue-400">{claim.order_code}</td>
                                        <td className="p-4 text-gray-800 dark:text-gray-200">{claim.fname} {claim.lname}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold 
                        ${claim.status === 'Resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                    claim.status === 'Claims Filed' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{claim.attendant}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
                                            {new Date(claim.updated_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleViewClaim(claim)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => { setSelectedClaim(claim); setShowStatusModal(true); }}
                                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                                            >
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {claims.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                            No claims found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                        <button
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page} of {Math.max(1, Math.ceil(totalClaims / 10))}
                        </span>
                        <button
                            onClick={() => setPage(prev => (prev * 10 < totalClaims ? prev + 1 : prev))}
                            disabled={page * 10 >= totalClaims}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                        >
                            Next
                        </button>
                    </div>
                </div>

            </div>

            {/* Add Claim Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">New Claim</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Order</label>
                            {!selectedOrder ? (
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Type order code or customer name..."
                                        value={orderSearch}
                                        onChange={e => setOrderSearch(e.target.value)}
                                    />
                                    {searchingOrders && <div className="absolute right-2 top-2 text-gray-400">Searching...</div>}
                                    <button
                                        onClick={handleOpenOrderList}
                                        className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title="Select from list"
                                    >
                                        <FaList />
                                    </button>
                                    {foundOrders.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
                                            {foundOrders.map(o => (
                                                <li
                                                    key={o.id}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                                                    onClick={() => setSelectedOrder(o)}
                                                >
                                                    <span className="font-bold text-blue-600">{o.order_code}</span> - {o.fname} {o.lname} ({o.brand} {o.model})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-800">
                                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                                        {selectedOrder.order_code} - {selectedOrder.fname} {selectedOrder.lname}
                                    </span>
                                    <button onClick={() => setSelectedOrder(null)} className="text-red-500 hover:text-red-700">Change</button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={4}
                                placeholder="Describe the issue..."
                                value={newClaimDescription}
                                onChange={e => setNewClaimDescription(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleCreateClaim} disabled={!selectedOrder} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Create Claim</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Selection List Modal */}
            {showOrderDataModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Select Order</h2>
                            <button onClick={() => setShowOrderDataModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>

                        <div className="overflow-y-auto flex-1 border rounded dark:border-gray-700">
                            {loadingRecentOrders ? (
                                <div className="p-8 text-center text-gray-500">Loading recent orders...</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-3 text-gray-600 dark:text-gray-300">Code</th>
                                            <th className="p-3 text-gray-600 dark:text-gray-300">Customer</th>
                                            <th className="p-3 text-gray-600 dark:text-gray-300">Vehicle</th>
                                            <th className="p-3 text-gray-600 dark:text-gray-300">Date</th>
                                            <th className="p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {recentOrders.map(o => (
                                            <tr key={o.id} className="hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => { setSelectedOrder(o); setShowOrderDataModal(false); }}>
                                                <td className="p-3 font-medium text-blue-600 dark:text-blue-400">{o.order_code}</td>
                                                <td className="p-3 text-gray-800 dark:text-gray-200">{o.fname} {o.lname}</td>
                                                <td className="p-3 text-gray-600 dark:text-gray-400">{o.brand} {o.model}</td>
                                                <td className="p-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                                                <td className="p-3 text-right">
                                                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs">Select</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {showStatusModal && selectedClaim && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Update Status</h2>
                        <div className="text-sm text-gray-500">Claim #{selectedClaim.id} - {selectedClaim.order_code}</div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                            <select
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={newStatus}
                                onChange={e => setNewStatus(e.target.value)}
                            >
                                <option value="">Select Status</option>
                                {CLAIM_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
                            <textarea
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={3}
                                value={statusDescription}
                                onChange={e => setStatusDescription(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleUpdateStatus} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Detail Modal */}
            {showDetailModal && selectedClaim && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Claim #{selectedClaim.id}</h2>
                                <div className="text-blue-600 font-medium mt-1">Order: {selectedClaim.order_code}</div>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded text-sm text-gray-700 dark:text-gray-200">
                            <div><strong>Customer:</strong> {selectedClaim.fname} {selectedClaim.lname}</div>
                            <div><strong>Attendant:</strong> {selectedClaim.attendant}</div>
                            <div><strong>Current Status:</strong> {selectedClaim.status}</div>
                            <div className="sm:col-span-2"><strong>Initial Description:</strong> {selectedClaim.claim_description}</div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Status History</h3>
                            <div className="space-y-4 relative border-l-2 border-gray-200 dark:border-gray-600 ml-3 pl-6">
                                {statusHistory.map((h: any) => (
                                    <div key={h.id} className="relative">
                                        <div className="absolute -left-[31px] bg-blue-500 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800"></div>
                                        <div className="text-gray-800 dark:text-white font-medium">{h.status}</div>
                                        <div className="text-gray-500 text-xs mb-1">{new Date(h.created_at).toLocaleString()}</div>
                                        <div className="text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded">{h.description}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowDetailModal(false); setShowStatusModal(true); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        <FaEdit />
                                        <span>Update Status</span>
                                    </button>
                                    <button
                                        onClick={handleViewOrderDetails}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                    >
                                        <FaEye />
                                        <span>View Order Data</span>
                                    </button>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Data Sheet Modal */}
            {showOrderSheetModal && viewOrderData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-end">
                            <button onClick={() => setShowOrderSheetModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        <OrderDataSheet
                            order={viewOrderData}
                            attachments={viewOrderAttachments}
                        />
                        <div className="flex justify-end pt-4">
                            <button onClick={() => setShowOrderSheetModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ClaimsPage;
