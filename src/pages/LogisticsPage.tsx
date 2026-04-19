import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

import { FaPlus, FaCheck, FaBoxOpen, FaSync, FaTimes, FaArrowLeft, FaLink, FaEdit, FaUsers, FaCopy, FaInfoCircle, FaTruck, FaSearch } from 'react-icons/fa';
import OrderDataSheet from '../components/OrderDataSheet';

interface ProcessingList {
    id: number;
    name: string;
    created_at: string;
    created_by_name: string;
    created_by_lname: string;
    total_orders: number;
    delivered_count: number;
    returned_count: number;
    searching_count: number;
    pending_count: number;
    ready_count: number;
    language?: string;
    assigned_user_ids?: number[];
    assigned_user_names?: string;
}

interface ProcessingListLink {
    id: number;
    name: string;
    token: string;
    expires_at: string;
    created_at: string;
}

interface Order {
    id: number;
    order_code: string;
    brand: string;
    model: string;
    year: string;
    prod_type?: string;
    customer_fname?: string;
    customer_lname?: string;
    wapp?: string;
    imsg?: string;
    processing_status?: string;
    status?: string;
}

const LogisticsPage: React.FC = () => {
    const [lists, setLists] = useState<ProcessingList[]>([]);
    const [loading, setLoading] = useState(false);
    const [userType, setUserType] = useState<string | null>(null);

    // View details state
    const [selectedList, setSelectedList] = useState<number | null>(null);
    const [listDetails, setListDetails] = useState<any>(null);
    const [listLinks, setListLinks] = useState<ProcessingListLink[]>([]);

    // Create/Edit list modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingListId, setEditingListId] = useState<number | null>(null);
    const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [newListName, setNewListName] = useState('');
    const [listLanguage, setListLanguage] = useState<string>('en');
    const [createLoading, setCreateLoading] = useState(false);
    const [copiedBanner, setCopiedBanner] = useState(false);

    // Link Management State
    const [newLinkName, setNewLinkName] = useState('');
    const [newLinkExpires, setNewLinkExpires] = useState<number>(7);
    const [linkLoading, setLinkLoading] = useState(false);

    // Order Detail Modal State
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);

    // Order search in modal
    const [orderSearch, setOrderSearch] = useState('');

    useEffect(() => {
        setUserType(localStorage.getItem('userType'));
        fetchLists();
    }, []);

    // Auto-refresh polling every 10 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Only update in background if we aren't showing a full-screen loading spinner
            if (!loading && !createLoading) {
                fetchLists(false);
                if (selectedList) {
                    loadListDetails(selectedList, false);
                }
            }
        }, 10000);
        return () => clearInterval(intervalId);
    }, [selectedList, loading, createLoading]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };


    const fetchLists = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            const { data } = await axios.get(`${API_URL}/api/processing-lists`, getAuthHeaders());
            setLists(data.lists || []);
        } catch (err) {
            console.error('Error fetching processing lists:', err);
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    const loadListDetails = async (id: number, _showSpinner = true) => {
        try {
            setSelectedList(id);
            const { data } = await axios.get(`${API_URL}/api/processing-lists/${id}`, getAuthHeaders());
            setListDetails(data);

            const { data: linksData } = await axios.get(`${API_URL}/api/processing-lists/${id}/links`, getAuthHeaders());
            setListLinks(linksData.links || []);
        } catch (err) {
            console.error('Error fetching list details or links:', err);
        }
    };

    const openCreateModal = async () => {
        setEditingListId(null);
        setNewListName('');
        setListLanguage('en');
        setSelectedOrders([]);
        setSelectedUsers([]);
        setOrderSearch('');
        setShowCreateModal(true);
        setCreateLoading(true);
        try {
            // Fetch available orders for logistics strictly
            const { data } = await axios.get(`${API_URL}/api/logistics/available-orders`, getAuthHeaders());
            setAvailableOrders(data.orders || []);

            // Fetch users for assignment (assume simple fetch)
            const usersRes = await axios.get(`${API_URL}/api/users?limit=200`, getAuthHeaders());
            // Filter out system users or just list active ones if needed. For now show all.
            const sortedUsers = (usersRes.data.users || []).sort((a: any, b: any) => a.fname.localeCompare(b.fname));
            setAvailableUsers(sortedUsers);
        } catch (err) {
            console.error('Error fetching data for creation:', err);
        } finally {
            setCreateLoading(false);
        }
    };

    const openEditModal = async (list: ProcessingList) => {
        setEditingListId(list.id);
        setNewListName(list.name);
        setListLanguage(list.language || 'en');
        setSelectedOrders([]);
        setSelectedUsers(list.assigned_user_ids || []);
        setOrderSearch('');
        setShowCreateModal(true);
        setCreateLoading(true);
        try {
            // We need available orders + the orders already in this list
            const { data: availData } = await axios.get(`${API_URL}/api/logistics/available-orders`, getAuthHeaders());
            const { data: listData } = await axios.get(`${API_URL}/api/processing-lists/${list.id}`, getAuthHeaders());

            const listOrders = listData.orders || [];
            const idsInList = listOrders.map((o: any) => o.id);
            setSelectedOrders(idsInList);

            setAvailableOrders([...listOrders, ...(availData.orders || [])]);

            const usersRes = await axios.get(`${API_URL}/api/users?limit=200`, getAuthHeaders());
            const sortedUsers = (usersRes.data.users || []).sort((a: any, b: any) => a.fname.localeCompare(b.fname));
            setAvailableUsers(sortedUsers);
        } catch (err) {
            console.error('Error fetching data for edit:', err);
        } finally {
            setCreateLoading(false);
        }
    };

    const toggleOrderSelection = (id: number) => {
        if (selectedOrders.includes(id)) {
            setSelectedOrders(selectedOrders.filter(o => o !== id));
        } else {
            setSelectedOrders([...selectedOrders, id]);
        }
    };

    const toggleUserSelection = (id: number) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(uId => uId !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const handleSaveList = async () => {
        if (!newListName.trim() || selectedOrders.length === 0) {
            alert('Please enter a list name and select at least one order.');
            return;
        }
        try {
            if (editingListId) {
                await axios.put(`${API_URL}/api/processing-lists/${editingListId}`, {
                    name: newListName,
                    orders: selectedOrders,
                    assigned_users: selectedUsers,
                    language: listLanguage
                }, getAuthHeaders());
            } else {
                await axios.post(`${API_URL}/api/processing-lists`, {
                    name: newListName,
                    orders: selectedOrders,
                    assigned_users: selectedUsers,
                    language: listLanguage
                }, getAuthHeaders());
            }

            setShowCreateModal(false);
            setEditingListId(null);
            setNewListName('');
            setListLanguage('en');
            setSelectedOrders([]);
            setSelectedUsers([]);
            fetchLists(); // Refetch
        } catch (err) {
            console.error('Error saving list:', err);
            alert('Failed to save list.');
        }
    };

    const handleCopyLink = (token: string) => {
        const link = `${window.location.origin}/radar/shared-list/${token}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedBanner(true);
            setTimeout(() => setCopiedBanner(false), 3000);
        });
    };

    const handleDeleteList = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this list?')) return;
        try {
            await axios.delete(`${API_URL}/api/processing-lists/${id}`, getAuthHeaders());
            if (selectedList === id) {
                setSelectedList(null);
                setListDetails(null);
            }
            fetchLists();
        } catch (err) {
            console.error('Error deleting list:', err);
            alert('Failed to delete list.');
        }
    };

    const handleUpdateOrderStatus = async (orderId: number, status: string) => {
        if (!selectedList) return;
        try {
            await axios.put(`${API_URL}/api/processing-lists/${selectedList}/orders/${orderId}/status`, { status }, getAuthHeaders());
            // Update local state without refetching immediately
            if (listDetails) {
                setListDetails({
                    ...listDetails,
                    orders: listDetails.orders.map((o: any) => o.id === orderId ? { ...o, processing_status: status } : o)
                });
            }
            // Also update the main list stats if we can, but refetching is safer
            fetchLists();
        } catch (err) {
            console.error('Error updating order status:', err);
            alert('Failed to update status.');
        }
    };

    const handleCreateLink = async () => {
        if (!selectedList || !newLinkName.trim()) {
            alert('Please enter a name for the link.');
            return;
        }
        try {
            setLinkLoading(true);
            await axios.post(`${API_URL}/api/processing-lists/${selectedList}/links`, {
                name: newLinkName,
                expires_in_days: newLinkExpires
            }, getAuthHeaders());
            setNewLinkName('');
            setNewLinkExpires(7);

            // Reload links
            const { data: linksData } = await axios.get(`${API_URL}/api/processing-lists/${selectedList}/links`, getAuthHeaders());
            setListLinks(linksData.links || []);
        } catch (err) {
            console.error('Error creating link:', err);
            alert('Failed to create link.');
        } finally {
            setLinkLoading(false);
        }
    };

    const handleRevokeLink = async (linkId: number) => {
        if (!selectedList) return;
        if (!window.confirm('Are you sure you want to revoke this link? Anyone using it will immediately lose access.')) return;

        try {
            setLinkLoading(true);
            await axios.delete(`${API_URL}/api/processing-lists/${selectedList}/links/${linkId}`, getAuthHeaders());

            // Reload links
            const { data: linksData } = await axios.get(`${API_URL}/api/processing-lists/${selectedList}/links`, getAuthHeaders());
            setListLinks(linksData.links || []);
        } catch (err) {
            console.error('Error revoking link:', err);
            alert('Failed to revoke link.');
        } finally {
            setLinkLoading(false);
        }
    };

    // --- Render helpers ---
    const getProgressColor = (list: ProcessingList) => {
        const total = Number(list.total_orders);
        if (total === 0) return 'bg-gray-200';
        if (Number(list.returned_count) > 0) return 'bg-orange-500';
        if (Number(list.delivered_count) === total) return 'bg-green-500';
        if (Number(list.pending_count) === total) return 'bg-red-500';
        return 'bg-yellow-400';
    };

    const getProgressPercentage = (list: ProcessingList) => {
        const total = Number(list.total_orders);
        if (total === 0) return 0;
        // Calculate percentage based on Delivered vs Total
        return Math.round((Number(list.delivered_count) / total) * 100);
    };

    const renderContent = () => {
        if (selectedList && listDetails) {
            const activeListInfo = lists.find(l => l.id === selectedList);

            return (
                <div className="max-w-6xl mx-auto">
                    <button
                        onClick={() => setSelectedList(null)}
                        className="mb-4 flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                    >
                        <FaArrowLeft className="mr-2" /> Back to Queues
                    </button>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">{listDetails.name}</h2>
                                <p className="text-gray-600 dark:text-gray-400">Created by {listDetails.created_by_name} {listDetails.created_by_lname} on {new Date(listDetails.created_at).toLocaleDateString()}</p>
                            </div>

                            {(userType === '1' || userType === '3') && activeListInfo && (
                                <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
                                    <button
                                        onClick={() => openEditModal(activeListInfo)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors font-medium border border-gray-200 dark:border-gray-600"
                                    >
                                        <FaEdit /> Edit List
                                    </button>
                                    <button
                                        onClick={() => handleDeleteList(activeListInfo.id)}
                                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg flex items-center gap-2 transition-colors font-medium border border-red-200 dark:border-red-800"
                                    >
                                        <FaTimes /> Delete List
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {listDetails.orders?.map((order: any) => (
                                <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 dark:bg-gray-800">
                                    <div>
                                        {/* Order number + info icon inline */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <button
                                                onClick={() => setSelectedOrderDetail(order)}
                                                className="flex items-center gap-1.5 font-bold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                                title="View Order Details"
                                            >
                                                Order #{order.order_code?.slice(-6) || order.id}
                                                <FaInfoCircle size={15} className="text-blue-400 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300 transition-colors" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {order.year} {order.brand} {order.model} &bull; <span className="text-gray-500 dark:text-gray-400">{order.prod_type}</span>
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Customer: {order.customer_fname} {order.customer_lname}
                                        </p>
                                        {order.stock_nr && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Stock #: {order.stock_nr}</p>}
                                    </div>

                                    <div className="flex flex-wrap gap-2 items-center">
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'Pending')}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${order.processing_status === 'Pending' ? 'bg-red-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'Searching')}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${order.processing_status === 'Searching' ? 'bg-yellow-400 text-gray-900 shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            Searching
                                        </button>
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'Ready for Pick Up')}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${order.processing_status === 'Ready for Pick Up' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            <FaTruck /> Ready for Pick Up
                                        </button>
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${order.processing_status === 'Delivered' ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            <FaCheck /> Delivered
                                        </button>
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'Returned')}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${order.processing_status === 'Returned' ? 'bg-orange-500 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            Returned
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!listDetails.orders || listDetails.orders.length === 0) && (
                                <p className="text-gray-500 text-center py-8">No orders in this list.</p>
                            )}
                        </div>

                        {/* LINK MANAGEMENT SECTION */}
                        {(userType === '1' || userType === '3') && (
                            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <FaLink className="text-blue-500" /> Shareable Links
                                </h3>

                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Name / Operator Name</label>
                                        <input
                                            type="text"
                                            value={newLinkName}
                                            onChange={(e) => setNewLinkName(e.target.value)}
                                            placeholder="e.g. Driver John"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="w-full md:w-48">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid For (Days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={newLinkExpires}
                                            onChange={(e) => setNewLinkExpires(Number(e.target.value))}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateLink}
                                        disabled={linkLoading}
                                        className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {linkLoading ? 'Creating...' : 'Generate New Link'}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {listLinks.map(link => {
                                        const isExpired = new Date(link.expires_at) < new Date();
                                        return (
                                            <div key={link.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border ${isExpired ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                                                <div className="mb-3 sm:mb-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 dark:text-gray-100">{link.name}</span>
                                                        {isExpired && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Expired</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        Created: {new Date(link.created_at).toLocaleDateString()} • Expires: {new Date(link.expires_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button
                                                        onClick={() => handleCopyLink(link.token)}
                                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isExpired ? 'bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 ring-1 ring-blue-200 dark:ring-blue-800'}`}
                                                    >
                                                        <FaCopy /> {isExpired ? 'Copy Expired Link' : 'Copy'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevokeLink(link.id)}
                                                        disabled={linkLoading}
                                                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {listLinks.length === 0 && (
                                        <p className="text-gray-500 italic text-sm text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg">No public links generated for this list yet.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">Logistics & Delivery Queues</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage order processing lists and track delivery status.</p>
                    </div>

                    {(userType === '1' || userType === '3') && (
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg font-semibold flex items-center gap-2 transition-transform transform hover:scale-105"
                        >
                            <FaPlus /> Create New List
                        </button>
                    )}
                </div>

                {copiedBanner && (
                    <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-2 animate-bounce">
                        <FaCheck /> Public link copied to clipboard!
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12"><FaSync className="animate-spin text-4xl text-blue-500" /></div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {lists.map(list => {
                            const perc = getProgressPercentage(list);
                            return (
                                <div
                                    key={list.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer flex flex-col sm:flex-row border border-gray-200 dark:border-gray-700 pb-2 sm:pb-0"
                                    onClick={() => loadListDetails(list.id)}
                                >
                                    {/* Left Segment: Name & Metadata */}
                                    <div className="p-5 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{list.name}</h3>
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                {(userType === '1' || userType === '3') && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(list); }}
                                                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                            title="Edit List"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                                                            className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                            title="Delete List"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            <span className="flex items-center gap-2"><FaBoxOpen className="text-gray-400" /> {list.total_orders} Orders</span>
                                            <span className="flex items-center gap-2"><FaUsers className="text-gray-400" /> {list.assigned_user_names || 'No operators assigned'}</span>
                                        </div>
                                    </div>

                                    {/* Right Segment: Stats Grid */}
                                    <div className="p-4 sm:w-[50%] md:w-[45%] flex items-center bg-gray-50/50 dark:bg-gray-750/30 mb-1 sm:mb-[4px]">
                                        <div className="grid grid-cols-5 gap-1 w-full">
                                            <div className="text-center"><div className="text-xl font-bold text-green-500">{list.delivered_count ?? 0}</div><div className="text-[10px] text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Deliv</div></div>
                                            <div className="text-center"><div className="text-xl font-bold text-yellow-500">{list.searching_count ?? 0}</div><div className="text-[10px] text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Search</div></div>
                                            <div className="text-center"><div className="text-xl font-bold text-blue-500">{list.ready_count ?? 0}</div><div className="text-[10px] text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Ready</div></div>
                                            <div className="text-center"><div className="text-xl font-bold text-red-500">{list.pending_count ?? 0}</div><div className="text-[10px] text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Pend</div></div>
                                            <div className="text-center"><div className="text-xl font-bold text-orange-500">{list.returned_count ?? 0}</div><div className="text-[10px] text-gray-600 dark:text-gray-300 uppercase tracking-wider font-semibold">Ret</div></div>
                                        </div>
                                    </div>

                                    {/* Thin Bottom Progress Border */}
                                    <div className="absolute bottom-0 left-0 h-1.5 bg-gray-200 dark:bg-gray-700 w-full" style={{ zIndex: 10 }}>
                                        <div
                                            className={`h-full ${getProgressColor(list)}`}
                                            style={{ width: `${perc}%`, transition: 'width 0.5s ease-in-out' }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}

                        {lists.length === 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
                                <FaBoxOpen className="mx-auto text-6xl mb-4 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-xl font-medium">No processing lists found</h3>
                                <p className="mt-2 text-gray-400">Create a new list to get started.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
            {renderContent()}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                            <h2 className="text-2xl font-bold">Create Processing List</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <div className="flex-grow flex flex-col md:flex-row min-h-0 overflow-hidden">
                            {/* Left Side: Assign Users */}
                            <div className="w-full md:w-1/3 p-6 border-r border-b md:border-b-0 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto hidden-scrollbar">
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">List Name</label>
                                    <input
                                        type="text"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        placeholder="e.g. Delivery Route North"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Language (Public Link)</label>
                                    <select
                                        value={listLanguage}
                                        onChange={(e) => setListLanguage(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                    >
                                        <option value="en">English (Default)</option>
                                        <option value="es">Español</option>
                                    </select>
                                </div>

                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Assign Operators</h3>
                                {createLoading ? (
                                    <div className="flex justify-center py-4"><FaSync className="animate-spin text-xl text-blue-500" /></div>
                                ) : (
                                    <div className="space-y-2">
                                        {availableUsers.map(u => (
                                            <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(u.id)}
                                                    onChange={() => toggleUserSelection(u.id)}
                                                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                />
                                                <span className="text-sm font-medium">{u.fname} {u.lname}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Select Orders */}
                            <div className="w-full md:w-2/3 p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
                                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                    <h3 className="text-lg font-semibold">Available Orders <span className="text-sm text-blue-500 ml-2">({selectedOrders.length} selected)</span></h3>
                                    <div className="text-xs text-gray-500 italic mt-1 sm:mt-0 bg-white dark:bg-gray-700 px-2 py-1 rounded shadow-sm">Strictly filters assigned or shipped orders.</div>
                                </div>

                                {createLoading ? (
                                    <div className="flex justify-center p-8"><FaSync className="animate-spin text-3xl text-blue-500" /></div>
                                ) : (
                                    <>
                                        {/* Search bar */}
                                        <div className="relative mb-4">
                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={orderSearch}
                                                onChange={e => setOrderSearch(e.target.value)}
                                                placeholder="Search by order #, customer name or phone..."
                                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm"
                                            />
                                        </div>
                                        {(() => {
                                            const q = orderSearch.toLowerCase().trim();
                                            const filteredOrders = q
                                                ? availableOrders.filter(o =>
                                                    (o.order_code && o.order_code.toLowerCase().includes(q)) ||
                                                    (o.customer_fname && o.customer_fname.toLowerCase().includes(q)) ||
                                                    (o.customer_lname && o.customer_lname.toLowerCase().includes(q)) ||
                                                    (`${o.customer_fname} ${o.customer_lname}`.toLowerCase().includes(q)) ||
                                                    (o.wapp && o.wapp.includes(q)) ||
                                                    (o.imsg && o.imsg.includes(q)) ||
                                                    (o.brand && o.brand.toLowerCase().includes(q)) ||
                                                    (o.model && o.model.toLowerCase().includes(q)) ||
                                                    (`${o.year} ${o.brand} ${o.model}`.toLowerCase().includes(q)) ||
                                                    (o.prod_type && o.prod_type.toLowerCase().includes(q))
                                                )
                                                : availableOrders;
                                            return (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {filteredOrders.map(order => (
                                                        <div
                                                            key={order.id}
                                                            onClick={() => toggleOrderSelection(order.id)}
                                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center ${selectedOrders.includes(order.id) ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' : 'border-white dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800 shadow-sm'}`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-lg">#{order.order_code?.slice(-6) || order.id}</span>
                                                                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300">{order.status || 'Pending'}</span>
                                                                    {order.prod_type && <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md font-medium">{order.prod_type}</span>}
                                                                </div>
                                                                <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{order.year} {order.brand} {order.model}</p>
                                                                <p className="text-xs text-gray-500 mt-1">{order.customer_fname} {order.customer_lname}</p>
                                                            </div>
                                                            {selectedOrders.includes(order.id) && (
                                                                <div className="mt-2 sm:mt-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                                                                    <FaCheck />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {filteredOrders.length === 0 && (
                                                        <div className="col-span-full text-center text-gray-500 py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                                                            <FaBoxOpen className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                            {q ? 'No orders match your search.' : 'No assignable orders found in system.'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-end gap-3 shadow-top z-10">
                            <button onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveList}
                                disabled={selectedOrders.length === 0 || !newListName.trim()}
                                className="px-6 py-2.5 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                            >
                                {editingListId ? 'Save Changes' : 'Create List'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrderDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4" onClick={() => setSelectedOrderDetail(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">#{selectedOrderDetail.order_code?.slice(-6)} &mdash; {selectedOrderDetail.year} {selectedOrderDetail.brand} {selectedOrderDetail.model}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrderDetail(null)}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
                            >
                                <FaTimes size={22} />
                            </button>
                        </div>
                        {/* Status Badge */}
                        <div className="px-5 pt-4 pb-0 flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Queue Status:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedOrderDetail.processing_status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                selectedOrderDetail.processing_status === 'Searching' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                    selectedOrderDetail.processing_status === 'Returned' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                }`}>{selectedOrderDetail.processing_status || 'Pending'}</span>
                        </div>
                        {/* Body — reuse OrderDataSheet */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <OrderDataSheet order={{
                                ...selectedOrderDetail,
                                fname: selectedOrderDetail.customer_fname || selectedOrderDetail.fname,
                                lname: selectedOrderDetail.customer_lname || selectedOrderDetail.lname,
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticsPage;
