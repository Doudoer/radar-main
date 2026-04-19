import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import { FaCheck, FaBoxOpen, FaSync, FaInfoCircle, FaTimes, FaTruck } from 'react-icons/fa';
import OrderDataSheet from '../components/OrderDataSheet';

interface Order {
    id: number;
    order_code: string;
    brand: string;
    model: string;
    year: string;
    customer_fname?: string;
    customer_lname?: string;
    processing_status?: string;
}

interface ListDetails {
    id: number;
    name: string;
    created_at: string;
    created_by_name: string;
    created_by_lname: string;
    language?: string;
    orders: Order[];
}

const PublicLogisticsPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [listDetails, setListDetails] = useState<ListDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);

    useEffect(() => {
        if (token) {
            fetchListDetails();
        }
    }, [token]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (token && !error) {
                fetchListDetails(false);
            }
        }, 10000);
        return () => clearInterval(intervalId);
    }, [token, error]);

    const fetchListDetails = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            setError(null);
            const { data } = await axios.get(`${API_URL}/api/public/processing-lists/${token}`);
            setListDetails(data);
        } catch (err: any) {
            console.error('Error fetching public list details:', err);
            setError(err.response?.data?.error || 'Failed to load list details / Error al cargar lista.');
        } finally {
            if (showSpinner) setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: number, status: string) => {
        try {
            await axios.put(`${API_URL}/api/public/processing-lists/${token}/orders/${orderId}/status`, { status });
            // Update local state smoothly
            if (listDetails) {
                setListDetails({
                    ...listDetails,
                    orders: listDetails.orders.map(o => o.id === orderId ? { ...o, processing_status: status } : o)
                });
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 p-6">
                <FaSync className="animate-spin text-5xl text-blue-500 mb-4" />
                <h2 className="text-xl font-semibold">Loading Shared Logistics Queue...</h2>
            </div>
        );
    }

    if (error || !listDetails) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 p-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaBoxOpen className="text-3xl text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Queue Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    const totalOrders = listDetails.orders.length;
    const deliveredCount = listDetails.orders.filter(o => o.processing_status === 'Delivered').length;
    const progressPerc = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

    const isEs = listDetails.language === 'es';
    const t = {
        sharedQueue: isEs ? 'Cola Logística y de Envío Compartida' : 'Shared Logistics & Delivery Queue',
        createdBy: isEs ? 'Creado por' : 'Created by',
        completed: isEs ? 'Completada' : 'Completed',
        queue: isEs ? 'Cola' : 'Queue',
        total: isEs ? 'Total' : 'Total',
        deliv: isEs ? 'Entreg' : 'Deliv',
        orderId: isEs ? 'Orden #' : 'Order #',
        completedT: isEs ? 'Completado' : 'Completed',
        customer: isEs ? 'Cliente' : 'Customer',
        btnPending: isEs ? 'Pendiente' : 'Pending',
        btnSearching: isEs ? 'Buscando' : 'Searching',
        btnReady: isEs ? 'Listo para Entrega' : 'Ready for Pick Up',
        btnDelivered: isEs ? 'Entregado' : 'Delivered',
        btnReturned: isEs ? 'Devuelto' : 'Returned',
        noOrders: isEs ? 'No hay órdenes asignadas a esta lista.' : 'No orders assigned to this list.',
        details: isEs ? 'Ver Detalle' : 'View Details',
        orderDetails: isEs ? 'Detalle de Orden' : 'Order Details',
        queueStatus: isEs ? 'Estado en Cola' : 'Queue Status',
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                        <FaBoxOpen className="text-3xl text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500 mb-2">{listDetails.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">{t.sharedQueue}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        {t.createdBy} {listDetails.created_by_name} {listDetails.created_by_lname}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100 dark:border-gray-700">
                    {/* Summary Header */}
                    <div className="p-6 bg-gray-50/80 dark:bg-gray-750/50 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{progressPerc}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">{t.completed}<br />{t.queue}</div>
                        </div>
                        <div className="flex gap-6 max-w-sm w-full sm:w-auto">
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{totalOrders}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t.total}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-bold text-green-500">{deliveredCount}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t.deliv}</div>
                            </div>
                            <div className="flex-1"></div>
                        </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${progressPerc}%`, transition: 'width 0.5s ease' }}></div>
                    </div>

                    <div className="p-6 space-y-4">
                        {listDetails.orders.map((order) => (
                            <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <button
                                            onClick={() => setSelectedOrderDetail(order)}
                                            className="flex items-center gap-1.5 font-bold text-lg text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                                            title={t.details}
                                        >
                                            {t.orderId}{order.order_code?.slice(-6) || order.id}
                                            <FaInfoCircle size={15} className="text-blue-400 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300 transition-colors" />
                                        </button>
                                        {order.processing_status === 'Delivered' && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold uppercase tracking-wider">{t.completedT}</span>}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {order.year} {order.brand} {order.model}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {t.customer}: {order.customer_fname} {order.customer_lname}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 md:justify-end w-full md:w-auto">
                                    <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'Pending')}
                                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${order.processing_status === 'Pending' ? 'bg-red-500 text-white shadow-md scale-105 ring-2 ring-red-300 dark:ring-red-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        {t.btnPending}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'Searching')}
                                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${order.processing_status === 'Searching' ? 'bg-yellow-400 text-gray-900 shadow-md scale-105 ring-2 ring-yellow-200 dark:ring-yellow-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        {t.btnSearching}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'Ready for Pick Up')}
                                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${order.processing_status === 'Ready for Pick Up' ? 'bg-blue-500 text-white shadow-md scale-105 ring-2 ring-blue-300 dark:ring-blue-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        <FaTruck /> {t.btnReady}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')}
                                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${order.processing_status === 'Delivered' ? 'bg-green-500 text-white shadow-md scale-105 ring-2 ring-green-300 dark:ring-green-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        <FaCheck /> {t.btnDelivered}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateOrderStatus(order.id, 'Returned')}
                                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${order.processing_status === 'Returned' ? 'bg-orange-500 text-white shadow-md scale-105 ring-2 ring-orange-300 dark:ring-orange-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        {t.btnReturned}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {listDetails.orders.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p>{t.noOrders}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrderDetail && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
                    onClick={() => setSelectedOrderDetail(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.orderDetails}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">#{selectedOrderDetail.order_code?.slice(-6)} &mdash; {selectedOrderDetail.year} {selectedOrderDetail.brand} {selectedOrderDetail.model}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrderDetail(null)}
                                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
                            >
                                <FaTimes size={22} />
                            </button>
                        </div>
                        {/* Queue Status Badge */}
                        <div className="px-5 pt-4 pb-0 flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.queueStatus}:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedOrderDetail.processing_status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                selectedOrderDetail.processing_status === 'Searching' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                    selectedOrderDetail.processing_status === 'Returned' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                                        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                }`}>{selectedOrderDetail.processing_status || 'Pending'}</span>
                        </div>
                        {/* Body */}
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

export default PublicLogisticsPage;
