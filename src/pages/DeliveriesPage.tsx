import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useLocation } from 'react-router-dom';

interface Delivery {
  id: number;
  hour_price: number | null;
  hour_quantity: number | null;
  hour_totalamount: number | null;
  delivery_day: string | null;
  initial_hour: string | null;
  final_hour: string | null;
  receiver_person: string | null;
  driver_name: string | null;
  delivery_note: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_docpath: string | null;
  delivery_code: string | null;
  order_codes: string | null;
  delivery_status: string | null;
}

interface Order {
  id: number;
  order_code: string;
  brand: string;
  model: string;
  prod_type: string;
  year: string;
  fname: string;
  lname: string;
  customerId: number;
}

interface Customer {
  id: number;
  fname: string;
  lname: string;
  shippadd: string;
}

const DeliveriesPage: React.FC = () => {
  const location = useLocation();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedDeliveryForProof, setSelectedDeliveryForProof] = useState<Delivery | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [showSelectOrdersModal, setShowSelectOrdersModal] = useState(false);
  const [selectedOrderIdsForNew, setSelectedOrderIdsForNew] = useState<number[]>([]);
  const [groupedOrders, setGroupedOrders] = useState<Record<number, Order[]>>({});
  const [customerMap, setCustomerMap] = useState<Record<number, Customer>>({});
  const [form, setForm] = useState({
    hour_price: '75',
    hour_quantity: '',
    hour_totalamount: '',
    delivery_day: '',
    initial_hour: '',
    final_hour: '',
    receiver_person: '',
    driver_name: 'No Assigned',
    delivery_note: '',
    delivery_address: '',
    delivery_date: '',
    delivery_status: 'Pending Delivery',
  });

  const userType = localStorage.getItem('userType');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (userType === '1') {
      fetchDeliveries();
    }
  }, [userType]);

  useEffect(() => {
    const price = parseFloat(form.hour_price) || 0;
    const quantity = parseFloat(form.hour_quantity) || 0;
    const total = price * quantity;
    setForm(prev => ({ ...prev, hour_totalamount: total.toFixed(2) }));
  }, [form.hour_price, form.hour_quantity]);

  useEffect(() => {
    if (location.state && location.state.order) {
      const order = location.state.order;
      // Pre-fill the form with customer info from the order
      setForm(prev => ({
        ...prev,
        receiver_person: `${order.fname} ${order.lname}`,
        delivery_address: order.shipp_add || '',
      }));
      // Set selected orders to this order
      setSelectedOrderIdsForNew([order.id]);
      // Open the modal
      setShowModal(true);
    }
  }, [location.state]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/deliveries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setDeliveries(response.data.deliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders/available-for-delivery`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAvailableOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const fetchAvailableOrdersForGrouping = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders/available-for-delivery`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const orders: Order[] = response.data.orders;
      // Agrupa por customerId
      const grouped = orders.reduce((acc: Record<number, Order[]>, order: Order) => {
        if (!order.customerId) return acc;
        if (!acc[order.customerId]) acc[order.customerId] = [];
        acc[order.customerId].push(order);
        return acc;
      }, {});
      setGroupedOrders(grouped);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const fetchCustomers = async (hasShipping: boolean = false) => {
    try {
      const url = hasShipping ? `${API_URL}/api/customers?has_shipping=1` : `${API_URL}/api/customers`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const map = response.data.customers.reduce((acc: Record<number, Customer>, customer: Customer) => {
        acc[customer.id] = customer;
        return acc;
      }, {});
      setCustomerMap(map);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };



  const fetchAssignedOrders = async (deliveryId: number): Promise<Order[]> => {
    console.log('Fetching assigned orders for deliveryId:', deliveryId);
    try {
      const response = await axios.get(`${API_URL}/api/deliveries/${deliveryId}/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      console.log('Assigned orders response:', response.data);
      return response.data.orders;
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...form,
        hour_price: parseFloat(form.hour_price),
        hour_quantity: parseFloat(form.hour_quantity),
        hour_totalamount: parseFloat(form.hour_totalamount),
        driver_name: form.driver_name,
      };

      if (!editingDelivery) {
        // Generate delivery_code only for new deliveries
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
        const deliveryCode = `${day}${month}${year}-${randomNum}`;
        payload.delivery_code = deliveryCode;
      }

      if (editingDelivery) {
        await axios.put(`${API_URL}/api/delivery-details/${editingDelivery.id}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      } else {
        const response = await axios.post(`${API_URL}/api/delivery-details`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        // Assign selected orders to the new delivery
        if (selectedOrderIdsForNew.length > 0) {
          await axios.put(`${API_URL}/api/deliveries/${response.data.id}/assign-orders`, { orderIds: selectedOrderIdsForNew }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
        }
        setSelectedOrderIdsForNew([]);
      }
      fetchDeliveries();
      setShowModal(false);
      setEditingDelivery(null);
      resetForm();
    } catch (error) {
      console.error('Error saving delivery:', error);
    }
  };

  const resetForm = () => {
    setForm({
      hour_price: '75',
      hour_quantity: '',
      hour_totalamount: '',
      delivery_day: '',
      initial_hour: '',
      final_hour: '',
      receiver_person: '',
      driver_name: '',
      delivery_note: '',
      delivery_address: '',
      delivery_date: '',
      delivery_status: 'Pending Delivery',
    });
  };

  const handleEdit = (delivery: Delivery) => {
    const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';
    setEditingDelivery(delivery);
    setForm({
      hour_price: delivery.hour_price ? delivery.hour_price.toString() : '',
      hour_quantity: delivery.hour_quantity ? delivery.hour_quantity.toString() : '',
      hour_totalamount: delivery.hour_totalamount ? delivery.hour_totalamount.toString() : '',
      delivery_day: formatDate(delivery.delivery_day),
      initial_hour: delivery.initial_hour || '',
      final_hour: delivery.final_hour || '',
      receiver_person: delivery.receiver_person || '',
      driver_name: delivery.driver_name || '',
      delivery_note: delivery.delivery_note || '',
      delivery_address: delivery.delivery_address || '',
      delivery_date: formatDate(delivery.delivery_date),
      delivery_status: delivery.delivery_status || 'Pending Delivery',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this delivery?')) {
      try {
        await axios.delete(`${API_URL}/api/deliveries/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        fetchDeliveries();
      } catch (error) {
        console.error('Error deleting delivery:', error);
      }
    }
  };

  const handleAssignOrders = async () => {
    if (!selectedDelivery) return;
    try {
      await axios.put(`${API_URL}/api/deliveries/${selectedDelivery.id}/assign-orders`, { orderIds: selectedOrderIds }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setShowAssignModal(false);
      setSelectedOrderIds([]);
      fetchAssignedOrders(selectedDelivery.id);
      fetchDeliveries();
    } catch (error) {
      console.error('Error assigning orders:', error);
    }
  };

  const openAssignModal = async (delivery: Delivery) => {
    console.log('Opening assign modal for delivery:', delivery.id);
    setSelectedDelivery(delivery);
    await fetchCustomers(false);
    await fetchAvailableOrders();
    const assigned = await fetchAssignedOrders(delivery.id);
    console.log('Assigned orders loaded:', assigned);
    setAssignedOrders(assigned);
    setSelectedOrderIds(assigned.map((order: Order) => order.id));
    setShowAssignModal(true);
  };

  const openProofModal = (delivery: Delivery) => {
    setSelectedDeliveryForProof(delivery);
    setShowProofModal(true);
  };

  const handleProceedToDeliveryForm = () => {
    if (selectedOrderIdsForNew.length === 0) return;
    let customerId: number | null = null;
    for (const [cid, orders] of Object.entries(groupedOrders)) {
      if (orders.some(o => selectedOrderIdsForNew.includes(o.id))) {
        if (customerId !== null && customerId !== Number(cid)) {
          alert('Please select orders from only one customer.');
          return;
        }
        customerId = Number(cid);
      }
    }
    if (customerId === null) return;
    const customer = customerMap[customerId];
    if (customer) {
      resetForm();
      setForm(prev => ({
        ...prev,
        receiver_person: `${customer.fname} ${customer.lname}`,
        delivery_address: customer.shippadd || '',
      }));
      setShowSelectOrdersModal(false);
      setShowModal(true);
    }
  };

  const handleProofSubmit = async () => {
    if (!selectedDeliveryForProof || !proofFile) return;
    const formData = new FormData();
    formData.append('proof', proofFile);
    try {
      await axios.put(`${API_URL}/api/deliveries/${selectedDeliveryForProof.id}/proof`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setShowProofModal(false);
      setProofFile(null);
      fetchDeliveries();
    } catch (error) {
      console.error('Error uploading proof:', error);
    }
  };

  if (userType !== '1') {
    return (
      <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
        <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-6xl mt-8">
          <h1 className="text-2xl font-bold text-center">Access Denied</h1>
          <p className="text-center">Only Sys Admin can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-6xl mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-center">Deliveries</h1>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => {
              setSelectedOrderIdsForNew([]);
              setShowSelectOrdersModal(true);
              fetchCustomers(true);
              fetchAvailableOrdersForGrouping();
            }}
          >
            + New Delivery
          </button>
        </div>

        {loading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white dark:bg-gray-900 rounded shadow min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-2">Delivery Code</th>
                  <th className="p-2">Delivery Date</th>
                  <th className="p-2">Assigned Orders</th>
                  <th className="p-2">Driver</th>
                  <th className="p-2">Recipient</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center text-gray-500">No deliveries found.</td></tr>
                ) : (
                  deliveries.map((delivery) => (
                    <tr key={delivery.id} className="even:bg-gray-100 dark:even:bg-gray-700">
                      <td className="p-2">{delivery.delivery_code ? delivery.delivery_code.slice(-6) : ''}</td>
                      <td className="p-2">{delivery.delivery_date ? formatDate(delivery.delivery_date) : ''}</td>
                      <td className="p-2">{delivery.order_codes ? delivery.order_codes.split(',').map(code => code.slice(-6)).join(', ') : ''}</td>
                      <td className="p-2">{delivery.driver_name}</td>
                      <td className="p-2">{delivery.receiver_person}</td>
                      <td className="p-2">{delivery.delivery_address}</td>
                      <td className="p-2">{delivery.delivery_status}</td>
                      <td className="p-2 flex gap-2">
                        <button
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                          onClick={() => handleEdit(delivery)}
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900"
                          onClick={() => openAssignModal(delivery)}
                          title="Assign Orders"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                          onClick={() => handleDelete(delivery.id)}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900"
                          onClick={() => openProofModal(delivery)}
                          title="Proof Of Delivery"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for creating/editing delivery */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">{editingDelivery ? 'Edit Delivery' : 'New Delivery'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hour Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.hour_price}
                  onChange={e => setForm({ ...form, hour_price: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hour Quantity</label>
                <input
                  type="number"
                  value={form.hour_quantity}
                  onChange={e => setForm({ ...form, hour_quantity: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hour Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.hour_totalamount}
                  readOnly
                  className="w-full p-2 border rounded bg-gray-100"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Delivery Day</label>
                <input
                  type="date"
                  value={form.delivery_day}
                  onChange={e => setForm({ ...form, delivery_day: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Initial Hour</label>
                <input
                  type="time"
                  value={form.initial_hour}
                  onChange={e => setForm({ ...form, initial_hour: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Final Hour</label>
                <input
                  type="time"
                  value={form.final_hour}
                  onChange={e => setForm({ ...form, final_hour: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Recipient Person</label>
                <input
                  type="text"
                  value={form.receiver_person}
                  onChange={e => setForm({ ...form, receiver_person: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Driver Name</label>
                <input
                  type="text"
                  value={form.driver_name}
                  onChange={e => setForm({ ...form, driver_name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Delivery Note</label>
                <textarea
                  value={form.delivery_note}
                  onChange={e => setForm({ ...form, delivery_note: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={form.delivery_address}
                  onChange={e => setForm({ ...form, delivery_address: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Delivery Date</label>
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={e => setForm({ ...form, delivery_date: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Delivery Status</label>
                <select
                  value={form.delivery_status}
                  onChange={e => setForm({ ...form, delivery_status: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="Pending Delivery">Pending Delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for assigning orders */}
      {showAssignModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowAssignModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">Assign Orders to Delivery</h2>
            {(() => {
              const groupedAssigned = assignedOrders.reduce((acc: Record<string, Order[]>, order: Order) => {
                const key = order.fname && order.lname ? `${order.fname} ${order.lname}` : 'unknown';
                if (!acc[key]) acc[key] = [];
                acc[key].push(order);
                return acc;
              }, {});
              const groupedAvailable = availableOrders.reduce((acc: Record<string, Order[]>, order: Order) => {
                const key = order.fname && order.lname ? `${order.fname} ${order.lname}` : 'unknown';
                if (!acc[key]) acc[key] = [];
                acc[key].push(order);
                return acc;
              }, {});
              return (
                <>
                  <div className="mb-4">
                    <h3 className="font-semibold">Assigned Orders:</h3>
                    {Object.keys(groupedAssigned).length === 0 ? (
                      <p className="text-gray-500">No orders assigned.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {Object.keys(groupedAssigned)
                          .sort((a, b) => {
                            if (a === 'unknown') return 1;
                            if (b === 'unknown') return -1;
                            return a.localeCompare(b);
                          })
                          .map(customerName => {
                            const orders = groupedAssigned[customerName] || [];
                            return (
                              <div key={customerName} className="mb-2">
                                <h4 className="font-medium">{customerName === 'unknown' ? 'Unknown Customer' : customerName}</h4>
                                <div className="ml-4">
                                  {orders.map(order => (
                                    <label key={order.id} className="flex items-center gap-2 even:bg-gray-100 dark:even:bg-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={selectedOrderIds.includes(order.id)}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                                          } else {
                                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                          }
                                        }}
                                      />
                                      {order.order_code.slice(-6)} - {order.prod_type} {order.brand} {order.model} Year: {order.year}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h3 className="font-semibold">Available Orders:</h3>
                    {Object.keys(groupedAvailable).length === 0 ? (
                      <p className="text-gray-500">No available orders.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {Object.keys(groupedAvailable)
                          .sort((a, b) => {
                            if (a === 'unknown') return 1;
                            if (b === 'unknown') return -1;
                            return a.localeCompare(b);
                          })
                          .map(customerName => {
                            const orders = groupedAvailable[customerName] || [];
                            return (
                              <div key={customerName} className="mb-2">
                                <h4 className="font-medium">{customerName === 'unknown' ? 'Unknown Customer' : customerName}</h4>
                                <div className="ml-4">
                                  {orders.map(order => (
                                    <label key={order.id} className="flex items-center gap-2 even:bg-gray-100 dark:even:bg-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={selectedOrderIds.includes(order.id)}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                                          } else {
                                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                                          }
                                        }}
                                      />
                                      {order.order_code.slice(-6)} - {order.prod_type} {order.brand} {order.model} Year: {order.year}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
            <div className="flex justify-end gap-2">
              <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button type="button" className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleAssignOrders}>Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Proof Of Delivery */}
      {showProofModal && selectedDeliveryForProof && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowProofModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowProofModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">Proof Of Delivery</h2>
            <p className="mb-4">Delivery Code: {selectedDeliveryForProof.delivery_code ? selectedDeliveryForProof.delivery_code.slice(-6) : ''}</p>
            <input
              type="file"
              onChange={e => setProofFile(e.target.files?.[0] || null)}
              className="mb-4 w-full p-2 border rounded"
              accept="image/*,application/pdf"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowProofModal(false)}>Cancel</button>
              <button type="button" className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleProofSubmit} disabled={!proofFile}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for selecting orders for new delivery */}
      {showSelectOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowSelectOrdersModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowSelectOrdersModal(false)}>×</button>
            <h2 className="text-xl font-bold mb-4">Select Orders for New Delivery</h2>
            {Object.keys(groupedOrders).length === 0 ? (
              <p className="text-gray-500">No customers with available orders.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {Object.keys(groupedOrders)
                  .map(Number)
                  .sort((a, b) => {
                    const nameA = `${(customerMap[a]?.fname || '').trim()} ${(customerMap[a]?.lname || '').trim()}`.trim().toLowerCase();
                    const nameB = `${(customerMap[b]?.fname || '').trim()} ${(customerMap[b]?.lname || '').trim()}`.trim().toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map(customerId => {
                    const customer = customerMap[customerId];
                    const orders = groupedOrders[customerId] || [];
                    return (
                      <div key={customerId} className="mb-4">
                        <h3 className="font-semibold text-lg">
                          {customer ? `${customer.fname} ${customer.lname}`.trim() || `Customer ${customerId}` : `Customer ${customerId}`}
                        </h3>
                        {orders.length === 0 ? (
                          <p className="text-gray-500">No orders available.</p>
                        ) : (
                          <div className="ml-4">
                            {orders.map(order => (
                              <label key={order.id} className="flex items-center gap-2 even:bg-gray-100 dark:even:bg-gray-700">
                                <input
                                  type="checkbox"
                                  checked={selectedOrderIdsForNew.includes(order.id)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedOrderIdsForNew([...selectedOrderIdsForNew, order.id]);
                                    } else {
                                      setSelectedOrderIdsForNew(selectedOrderIdsForNew.filter(id => id !== order.id));
                                    }
                                  }}
                                />
                                {order.order_code.slice(-6)} - {order.prod_type} {order.brand} {order.model} {order.year}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowSelectOrdersModal(false)}>Cancel</button>
              <button
                type="button"
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleProceedToDeliveryForm}
                disabled={selectedOrderIdsForNew.length === 0}
              >
                Proceed to Delivery Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveriesPage;