import React, { useState, useEffect/*, useRef*/ } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import imageCompression from 'browser-image-compression';
import OrderForm from '../components/OrderForm';
import VinModal from '../components/VinModal';
import AttachmentCarousel from '../components/AttachmentCarousel';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';
// @ts-ignore
import domtoimage from 'dom-to-image';

// Tipos para los datos del VIN
interface VinApiData {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  VehicleType?: string;
  DisplacementL?: string;
  DriveType?: string;
  EngineCylinders?: string;
};

interface PayMethod {
  type: string;
  ccname: string;
  ccnumber: string;
  ccexpdate: string;
  cccvc: string;
  cczip: string;
  refpay: string;
  status: number;
};

const initialForm = {
  brand: '',
  model: '',
  year: '',
  drive_type: '',
  prod_type: '',
  disp_liter: '',
  cylinders: '',
  price: '',
  warranty: '',
  vin_nr: '',
  stock_nr: '',
  core: 0,
  core_amount: '150',
  shipping: 0,
  shipp_add: '',
  down_pay: 200,
  id_stat_order: '',
  orderDescription: '',
  transmissionType: '',
  ordermiles: '',
};

const initialCustomer = {
  id: '',
  fname: '',
  lname: '',
  wapp: '',
  imsg: '',
  shippadd: '',
  zip: '',
};

const initialPayMethod = {
  type: '',
  ccname: '',
  ccnumber: '',
  ccexpdate: '',
  cccvc: '',
  cczip: '',
  refpay: '',
  status: 0,
};

const initialStatus = {
  status: '',
  description: '',
  user_init: '',
};

const STATUS_OPTIONS = [
  { id: 1, status: 'Pending 🕒' },
  { id: 2, status: 'Verify Credit Card Pay 💳' },
  { id: 3, status: 'Verify Zelle Payment 💰' },
  { id: 4, status: 'Verify CashApp Payment 💰' },
  { id: 5, status: 'Verify In-Person Pay 👤' },
  { id: 6, status: 'Paid ✅' },
  { id: 7, status: 'Preparing Item 🫳🏼' },
  { id: 8, status: 'Ready for Pickup 📦' },
  { id: 9, status: 'Picked Up 🚗' },
  { id: 10, status: 'Shipped 🚚' },
  { id: 11, status: 'Claim Filed 📝' },
  { id: 12, status: 'Refunded 💸' },
];

const PAYMENT_TYPES = [
  { value: 'Verify Credit Card Pay 💳', label: 'Credit Card' },
  { value: 'Verify Zelle Payment 💰', label: 'Zelle' },
  { value: 'Verify CashApp Payment 💰', label: 'CashApp' },
  { value: 'Verify In-Person Pay 👤', label: 'Cash In Person' },
];

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  // Helpers for masking (same as in OrderForm)
  function maskCardNumber(card: string): string {
    if (!card) return '';
    const digits = card.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return '************' + digits.slice(-4);
  }
  function maskExpDate(_expDate: string): string {
    return '****';
  }
  function maskCVC(_cvc: string): string {
    return '****';
  }
  function maskZIP(_zip: string): string {
    return '******';
  }
  // Modal para mostrar info de pago
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
  const [paymentInfoModalData, setPaymentInfoModalData] = useState<any>(null);
  // Estado para modales de acciones
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [statusDescInput, setStatusDescInput] = useState('');
  const [showRegisterPaymentModal, setShowRegisterPaymentModal] = useState(false);
  const [registerPaymentLoading, setRegisterPaymentLoading] = useState(false);
  const [registerPaymentSuccess, setRegisterPaymentSuccess] = useState('');
  const [registerPaymentError, setRegisterPaymentError] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [payInPersonChecked, setPayInPersonChecked] = useState(false);
  const [registerPaymentPayMethod, setRegisterPaymentPayMethod] = useState<any>(null);

  // Estado para modal Proof of Delivery
  const [showProofOfDeliveryModal, setShowProofOfDeliveryModal] = useState(false);
  const [selectedOrderForPOD, setSelectedOrderForPOD] = useState<any>(null);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podThumbnail, setPodThumbnail] = useState<string | null>(null);
  const [podUploading, setPodUploading] = useState(false);
  // Fecha seleccionada para la prueba de entrega (por defecto hoy)
  const todayISO = new Date().toISOString().slice(0, 10);
  const [podDate, setPodDate] = useState<string>(todayISO);

  // Estado para fecha de entrega en modal de status
  const [deliveryDate, setDeliveryDate] = useState<string>('');

  // Estado para modal de opciones de delivery
  const [showDeliveryOptionsModal, setShowDeliveryOptionsModal] = useState(false);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [showAssignToDeliveryModal, setShowAssignToDeliveryModal] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [assignedOrdersToDelivery, setAssignedOrdersToDelivery] = useState<any[]>([]);

  // Attachments State
  const [newOrderFiles, setNewOrderFiles] = useState<File[]>([]);
  const [viewOrderAttachments, setViewOrderAttachments] = useState<any[]>([]);

  // Handler para abrir modal de registro de pago
  const handleOpenRegisterPaymentModal = () => {
    setShowRegisterPaymentModal(true);
    setRegisterPaymentSuccess('');
    setRegisterPaymentError('');
    setPaymentFile(null);
    setPaymentRefInput(selectedOrder?.pay_method?.refpay || '');
    setPayInPersonChecked(false);
    // Decrypt payMethod for display
    if (selectedOrder?.pay_method) {
      const decrypted = { ...selectedOrder.pay_method };
      if (selectedOrder.pay_method.type === 'Verify Credit Card Pay 💳' && selectedOrder.pay_method.status === 0) {
        try {
          const bytesNumber = CryptoJS.AES.decrypt(selectedOrder.pay_method.ccnumber, 'defaultkey');
          decrypted.ccnumber = JSON.parse(bytesNumber.toString(CryptoJS.enc.Utf8));
          const bytesCvc = CryptoJS.AES.decrypt(selectedOrder.pay_method.cccvc, 'defaultkey');
          decrypted.cccvc = JSON.parse(bytesCvc.toString(CryptoJS.enc.Utf8));
          const bytesZip = CryptoJS.AES.decrypt(selectedOrder.pay_method.cczip, 'defaultkey');
          decrypted.cczip = JSON.parse(bytesZip.toString(CryptoJS.enc.Utf8));
        } catch (error) {
          console.error('Error decrypting payment data:', error);
        }
      }
      setRegisterPaymentPayMethod(decrypted);
    }
  };

  // Handler para subir comprobante y registrar pago
  const handleRegisterPayment = async () => {
    if (!selectedOrder) return;
    setRegisterPaymentLoading(true);
    setRegisterPaymentError('');
    try {
      const formData = new FormData();
      formData.append('orderId', selectedOrder.id);
      formData.append('type', selectedOrder.pay_method.type);
      // Only append refpay when the payment type is NOT Cash In Person
      if (selectedOrder.pay_method.type !== 'Verify In-Person Pay 👤') {
        formData.append('refpay', paymentRefInput);
      }
      if (selectedOrder.pay_method.type === 'Verify Credit Card Pay 💳') {
        formData.append('ccname', selectedOrder.pay_method.ccname);
        formData.append('ccnumber', selectedOrder.pay_method.ccnumber);
        formData.append('cccvc', selectedOrder.pay_method.cccvc);
        formData.append('cczip', selectedOrder.pay_method.cczip);
      }
      if (paymentFile) {
        let fileToUpload = paymentFile;
        // Si es imagen, comprimir antes de subir
        if (fileToUpload.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            initialQuality: 0.85
          };
          fileToUpload = await imageCompression(fileToUpload, options);
        }
        // Renombrar el archivo usando el order_code
        const orderCode = selectedOrder.order_code || 'receipt';
        const ext = fileToUpload.name.split('.').pop();
        const newFile = new File([fileToUpload], `${orderCode}.${ext}`, { type: fileToUpload.type });
        formData.append('file', newFile);
      }
      if (selectedOrder.pay_method.type === 'Verify In-Person Pay 👤') {
        formData.append('paid', payInPersonChecked ? '1' : '0');
      }
      // Llama al endpoint para subir comprobante y actualizar status
      await axios.post(`${API_URL}/api/payments/${selectedOrder.id}/upload`, formData);
      // Actualiza el status a 1
      await axios.put(`${API_URL}/api/orders/${selectedOrder.id}/paymethod-status`, { status: 1 });
      // Insertar status 'Paid' en status_orders
      const paymentVerifiedStatus = STATUS_OPTIONS.find(option => option.id === 6)?.status || 'Paid ✅';
      await axios.post(`${API_URL}/api/orders/${selectedOrder.id}/status`, {
        status: paymentVerifiedStatus,
        description: selectedOrder.pay_method.type
      });
      // Set message in view modal
      setPaymentMessage('Payment has been registered successfully.');
      // Actualizar localmente el bloque de pagos registrados
      setSelectedOrder((prev: any) => {
        // Simula un nuevo pago registrado (puedes ajustar los campos según la API real)
        const newPayment = {
          id: Date.now(),
          type: prev.pay_method.type,
          refpay: paymentRefInput,
          file: paymentFile ? paymentFile.name : '',
          status: 1,
          created_at: new Date().toISOString()
        };
        const payments = Array.isArray(prev.payments) ? [...prev.payments, newPayment] : [newPayment];
        return {
          ...prev,
          pay_method: { ...prev.pay_method, status: 1 },
          payments
        };
      });
      // Refresh status history
      await loadStatusHistory(selectedOrder.id);
      setRegisterPaymentSuccess('Payment has been successfully processed.');
      setTimeout(() => setRegisterPaymentSuccess(''), 2500);
      setShowRegisterPaymentModal(false);
      // Refresh the order list
      fetchOrders();
    } catch (err) {
      setRegisterPaymentError('Error processing payment.');
      setPaymentMessage('Error registering payment.');
    }
    setRegisterPaymentLoading(false);
  };

  // Handler para ver hoja de datos y cargar historial de estatus
  const [orderStatusHistory, setOrderStatusHistory] = useState<any[]>([]);
  const [statusPage, setStatusPage] = useState(1);
  const STATUS_PAGE_SIZE = 5;
  const [statusTotal, setStatusTotal] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const loadStatusHistory = async (orderId: number, page: number = 1) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/orders/${orderId}/status-history?page=${page}&limit=${STATUS_PAGE_SIZE}`);
      setOrderStatusHistory(data.statusHistory || []);
      setStatusTotal(data.total || data.statusHistory.length);
    } catch (err) {
      setOrderStatusHistory([]);
      setStatusTotal(0);
    }
  };

  const handleViewOrder = async (order: any) => {
    setSelectedOrder(order);
    setStatusPage(1);
    setPaymentMessage(null); // Clear message when opening

    // Fetch Status History
    loadStatusHistory(order.id);

    // Fetch Attachments
    try {
      const { data } = await axios.get(`${API_URL}/api/orders/${order.id}/attachments`);
      const token = localStorage.getItem('token');
      const attachmentsWithToken = (data.attachments || []).map((att: any) => ({
        ...att,
        url: att.url ? `${att.url.startsWith('http') ? att.url : `${API_URL}${att.url}`}?token=${token}` : att.url
      }));
      setViewOrderAttachments(attachmentsWithToken);
    } catch (err) {
      console.error('Error fetching attachments:', err);
      setViewOrderAttachments([]);
    }

    setShowViewModal(true);
  };

  // Handler para cambiar página del historial de estatus
  const handleStatusPageChange = async (newPage: number) => {
    setStatusPage(newPage);
    await loadStatusHistory(selectedOrder.id, newPage);
  };

  const handleShareScreenshot = async () => {
    const element = document.querySelector('.order-data-sheet-content');
    if (!element) {
      alert('Content not found. Please try again.');
      return;
    }
    try {
      domtoimage.toBlob(element as HTMLElement, { bgcolor: '#ffffff' }).then(async (blob: Blob) => {
        if (!blob) {
          alert('Failed to generate image. Please use the PDF download.');
          return;
        }
        const file = new File([blob], 'order-data-sheet.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Order Data Sheet',
              text: `Order ${selectedOrder?.order_code?.slice(-6)}`
            });
          } catch (err) {
            console.error('Error sharing:', err);
            // Fallback to download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'order-data-sheet.png';
            a.click();
            URL.revokeObjectURL(url);
          }
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'order-data-sheet.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Error generating screenshot:', err);
      alert('Unable to generate screenshot. Please try again or use the PDF download.');
    }
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.order-data-sheet-content');
    if (!element) {
      console.error('Element not found');
      return;
    }
    console.log('Element found:', element.innerHTML.substring(0, 200));
    // Usar dom-to-image para consistencia con el screenshot
    domtoimage.toBlob(element as HTMLElement, { bgcolor: '#ffffff' }).then((blob: Blob) => {
      if (!blob) {
        alert('Failed to generate image. Please try again.');
        return;
      }
      // Convertir blob a dataURL
      const reader = new FileReader();
      reader.onload = function (event) {
        const imgData = event.target?.result as string;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 295;
        const margin = 10;
        const imgWidth = pageWidth - 2 * margin; // 190mm
        const imgHeight = pageHeight - 2 * margin; // 275mm
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        pdf.save(`order-data-sheet-${selectedOrder?.order_code?.slice(-6) || 'unknown'}.pdf`);
      };
      reader.readAsDataURL(blob);
    }).catch((err: any) => {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    });
  };

  // Handler para editar estatus
  const handleEditStatus = (order: any) => {
    setSelectedOrder(order);
    setStatusInput(order.status || '');
    setStatusDescInput(order.orderDescription || '');
    setDeliveryDate(''); // Reset delivery date
    setShowStatusModal(true);
  };

  // Modal de confirmación para archivar orden
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveOrderId, setArchiveOrderId] = useState<number | null>(null);
  const [archiveAction, setArchiveAction] = useState<'archive' | 'recover'>('archive');
  const handleArchiveOrder = (orderId: number, isArchived: boolean) => {
    setArchiveOrderId(orderId);
    setArchiveModalOpen(true);
    setArchiveAction(isArchived ? 'recover' : 'archive');
  };
  const confirmArchiveOrder = async () => {
    if (!archiveOrderId) return;
    if (archiveAction === 'archive') {
      await axios.put(`${API_URL}/api/orders/${archiveOrderId}/archive`);
      setSuccessMsg('Orden archivada');
    } else {
      await axios.put(`${API_URL}/api/orders/${archiveOrderId}/recover`);
      setSuccessMsg('Orden recuperada');
    }
    fetchOrders();
    setTimeout(() => setSuccessMsg(''), 2500);
    setArchiveModalOpen(false);
    setArchiveOrderId(null);
  };

  // Handler para guardar estatus
  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    if (!statusInput.trim()) {
      alert('Please select a status.');
      return;
    }
    console.log('Status to save:', statusInput); // Depuración
    const payload: any = { status: statusInput, description: statusDescInput };
    if (statusInput === 'Picked Up 🚗' && deliveryDate) {
      payload.delivery_date = deliveryDate;
    }
    await axios.post(`${API_URL}/api/orders/${selectedOrder.id}/status`, payload);
    setShowStatusModal(false);
    fetchOrders();
    setSuccessMsg('Estatus actualizado');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // Handler para cambiar archivo de prueba de entrega
  const handlePodFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPodFile(file);
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPodThumbnail(url);
    } else {
      setPodThumbnail(null);
    }
  };

  // Handler para subir prueba de entrega
  const handlePodUpload = async () => {
    if (!podFile || !selectedOrderForPOD) return;
    setPodUploading(true);
    console.log('Enviando comprobante:', {
      file: podFile.name,
      delivery_date: podDate,
      order_code: selectedOrderForPOD.order_code,
      orderId: selectedOrderForPOD.id
    });
    try {
      const formData = new FormData();
      formData.append('file', podFile);
      // include delivery_date (ISO yyyy-mm-dd) and order_code so server can store date and rename file
      formData.append('delivery_date', podDate);
      if (selectedOrderForPOD.order_code) formData.append('order_code', selectedOrderForPOD.order_code);
      const { data } = await axios.post(`${API_URL}/api/orders/${selectedOrderForPOD.id}/upload-delivery-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Respuesta del servidor:', data);
      // Update local order with returned path and date (prefer server-provided doc_url)
      setSelectedOrderForPOD((prev: any) => ({
        ...prev,
        deliveryproof_docpath: data.filePath || prev.deliveryproof_docpath,
        deliveryproof_date: podDate || prev.deliveryproof_date
      }));
      // If server returned a doc_url, use it as thumbnail (good for images)
      if (data.doc_url) {
        // make sure it's absolute for browser
        const url = data.doc_url.startsWith('http') ? data.doc_url : `${API_URL}/${data.filePath}`;
        setPodThumbnail(url);
      }
      setPodFile(null);
      setSuccessMsg('Delivery proof uploaded successfully');
      setTimeout(() => setSuccessMsg(''), 2500);
      // Refetch orders to update warranty status
      fetchOrders();
    } catch (err) {
      console.error('Error al subir comprobante:', err);
      setSuccessMsg('Error uploading delivery proof');
      setTimeout(() => setSuccessMsg(''), 2500);
    }
    setPodUploading(false);
  };
  // Mensaje de éxito
  const [successMsg, setSuccessMsg] = useState('');
  // Modal state for order creation
  const [showOrderModal, setShowOrderModal] = useState(false);
  // Card company logos SVG
  const cardLogos: Record<string, React.ReactNode> = {
    'Visa': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><text x="16" y="14" textAnchor="middle" fontSize="12" fill="#1a1f71" fontFamily="Arial">VISA</text></svg>,
    'MasterCard': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><circle cx="12" cy="10" r="6" fill="#eb001b" /><circle cx="20" cy="10" r="6" fill="#f79e1b" /><text x="16" y="17" textAnchor="middle" fontSize="8" fill="#333" fontFamily="Arial">MasterCard</text></svg>,
    'American Express': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><text x="16" y="14" textAnchor="middle" fontSize="10" fill="#2e77bb" fontFamily="Arial">AMEX</text></svg>,
    'Discover': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><text x="16" y="14" textAnchor="middle" fontSize="10" fill="#f76c0c" fontFamily="Arial">Discover</text></svg>,
    'JCB': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><text x="16" y="14" textAnchor="middle" fontSize="10" fill="#007bc1" fontFamily="Arial">JCB</text></svg>,
    'Diners Club': <svg width="32" height="20" viewBox="0 0 32 20" className="inline-block align-middle"><rect width="32" height="20" rx="4" fill="#fff" /><text x="16" y="14" textAnchor="middle" fontSize="9" fill="#0066a1" fontFamily="Arial">Diners</text></svg>
  };
  // Card company detection
  const [cardCompany, setCardCompany] = useState('');

  // Card number input handler with company detection
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9 ]/g, '');
    setPayMethod({ ...payMethod, ccnumber: value });
    // Simple card company detection
    let company = '';
    if (/^4/.test(value)) company = 'Visa';
    else if (/^5[1-5]/.test(value)) company = 'MasterCard';
    else if (/^3[47]/.test(value)) company = 'American Express';
    else if (/^6(?:011|5)/.test(value)) company = 'Discover';
    else if (/^35/.test(value)) company = 'JCB';
    else if (/^30[0-5]|^36|^38/.test(value)) company = 'Diners Club';
    setCardCompany(company);
  };

  // Expiration month handler (max 12)
  const handleExpMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    const num = parseInt(value, 10);
    if (num > 12) value = '12';
    setPayMethod({ ...payMethod, ccexpdate: value + (payMethod.ccexpdate.length > 2 ? payMethod.ccexpdate.slice(2) : '') });
  };

  // Expiration year handler (2 digits)
  const handleExpYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    setPayMethod({ ...payMethod, ccexpdate: (payMethod.ccexpdate.slice(0, 2) || '') + value });
  };

  // CVC handler (only numbers, max 4 digits)
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    setPayMethod({ ...payMethod, cccvc: value });
  };
  const [orders, setOrders] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderSearch, setOrderSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterProdType, setFilterProdType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [customerId, setCustomerId] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customer, setCustomer] = useState(initialCustomer);
  const [payMethod, setPayMethod] = useState(initialPayMethod);
  const [status, setStatus] = useState(initialStatus);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  // Eliminados showPayDocModal y setShowPayDocModal
  const [autoSearchLoading, setAutoSearchLoading] = useState(false);
  const [autoSearchError, setAutoSearchError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Estados para modales de filtros y búsqueda
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [vinModalOpen, setVinModalOpen] = useState(false);
  // Permitir cerrar modales con Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showViewModal) setShowViewModal(false);
        if (showStatusModal) setShowStatusModal(false);
        if (archiveModalOpen) { setArchiveModalOpen(false); setArchiveOrderId(null); }
        if (showOrderModal) setShowOrderModal(false);
        if (vinModalOpen) setVinModalOpen(false);
        if (showFiltersModal) setShowFiltersModal(false);
        if (showDeliveryOptionsModal) setShowDeliveryOptionsModal(false);
        if (showAssignToDeliveryModal) setShowAssignToDeliveryModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showViewModal, showStatusModal, archiveModalOpen, showOrderModal, vinModalOpen, showFiltersModal, showDeliveryOptionsModal, showAssignToDeliveryModal]);
  // useEffect para manejar escape key en modal Proof of Delivery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showProofOfDeliveryModal) {
        setShowProofOfDeliveryModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showProofOfDeliveryModal]);
  const [vinData, setVinData] = useState<VinApiData | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState('');
  // Autocompletar cliente por WhatsApp, iMessage o nombre mostrando coincidencias
  useEffect(() => {
    if (!showCustomerForm) return;
    const wapp = customer.wapp.trim();
    const imsg = customer.imsg.trim();
    const fname = customer.fname.trim();
    const lname = customer.lname.trim();
    if (wapp.length < 3 && imsg.length < 3 && fname.length < 2 && lname.length < 2) return;
    setAutoSearchLoading(true);
    setAutoSearchError('');
    const timer = setTimeout(async () => {
      try {
        let foundCustomers: any[] = [];
        if (wapp.length >= 3) {
          const { data } = await axios.get(`${API_URL}/api/customers`, {
            params: { search: wapp }
          });
          if (data.customers && data.customers.length > 0) {
            foundCustomers = data.customers;
          }
        }
        if (foundCustomers.length === 0 && imsg.length >= 3) {
          const { data } = await axios.get(`${API_URL}/api/customers`, {
            params: { search: imsg }
          });
          if (data.customers && data.customers.length > 0) {
            foundCustomers = data.customers;
          }
        }
        if (foundCustomers.length === 0 && fname.length >= 2 && lname.length >= 2) {
          const { data } = await axios.get(`${API_URL}/api/customers`, {
            params: { search: `${fname} ${lname}` }
          });
          if (data.customers && data.customers.length > 0) {
            foundCustomers = data.customers;
          }
        }
        if (foundCustomers.length > 0) {
          setFilteredCustomers(foundCustomers);
        } else {
          setFilteredCustomers([]);
        }
      } catch (err) {
        setAutoSearchError('Error buscando cliente.');
      }
      setAutoSearchLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [customer.wapp, customer.imsg, customer.fname, customer.lname, showCustomerForm]);

  // Obtener usuario en sesión desde localStorage
  const userId = localStorage.getItem('userId') ?? '';
  const userType = localStorage.getItem('userType') ?? '';

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [orderSearch, filterStatus, filterBrand, filterModel, filterProdType, filterDateFrom, filterDateTo, currentPage, recordsPerPage, showArchived]);

  useEffect(() => {
    if (customerSearch.length > 0) {
      const filtered = customers.filter((c: any) =>
        `${c.fname} ${c.lname} ${c.wapp} ${c.imsg} ${c.zip}`.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, orderSearch, filterStatus, filterBrand, filterModel, filterProdType, filterDateFrom, filterDateTo, currentPage, recordsPerPage, showArchived]);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [orderSearch]);

  // Prellenar datos para edición
  useEffect(() => {
    if (selectedOrderForEdit) {
      // Prellenar form
      setForm({
        brand: selectedOrderForEdit.brand || '',
        model: selectedOrderForEdit.model || '',
        year: selectedOrderForEdit.year || '',
        drive_type: selectedOrderForEdit.drive_type || '',
        prod_type: selectedOrderForEdit.prod_type || '',
        disp_liter: selectedOrderForEdit.disp_liter || '',
        cylinders: selectedOrderForEdit.cylinders || '',
        price: selectedOrderForEdit.price || '',
        warranty: selectedOrderForEdit.warranty || '',
        vin_nr: selectedOrderForEdit.vin_nr || '',
        stock_nr: selectedOrderForEdit.stock_nr || '',
        core: selectedOrderForEdit.core || 0,
        core_amount: selectedOrderForEdit.core ? '' : (selectedOrderForEdit.core_amount || '150'),
        shipping: selectedOrderForEdit.shipping || 0,
        shipp_add: selectedOrderForEdit.shipping ? selectedOrderForEdit.shipp_add || '' : '',
        down_pay: selectedOrderForEdit.down_pay || 200,
        id_stat_order: selectedOrderForEdit.id_stat_order || '',
        orderDescription: selectedOrderForEdit.orderDescription || '',
        transmissionType: selectedOrderForEdit.transmissionType || '',
        ordermiles: selectedOrderForEdit.ordermiles || '',
      });
      // Prellenar customer
      setCustomer({
        id: String(selectedOrderForEdit.customer_id),
        fname: selectedOrderForEdit.fname || '',
        lname: selectedOrderForEdit.lname || '',
        wapp: selectedOrderForEdit.wapp || '',
        imsg: selectedOrderForEdit.imsg || '',
        shippadd: selectedOrderForEdit.shippadd || '',
        zip: selectedOrderForEdit.zip || '',
      });
      setCustomerId(selectedOrderForEdit.customer_id || '');
      setCustomerSearch(`${selectedOrderForEdit.fname || ''} ${selectedOrderForEdit.lname || ''}`);
      // Prellenar payMethod
      if (selectedOrderForEdit.pay_method) {
        const decryptedPayMethod = { ...selectedOrderForEdit.pay_method };
        if (selectedOrderForEdit.pay_method.type === 'Verify Credit Card Pay 💳') {
          if (selectedOrderForEdit.pay_method.status === 0) {
            // Decrypt sensitive fields only if not paid
            try {
              const bytesNumber = CryptoJS.AES.decrypt(selectedOrderForEdit.pay_method.ccnumber, 'defaultkey');
              decryptedPayMethod.ccnumber = JSON.parse(bytesNumber.toString(CryptoJS.enc.Utf8));
              const bytesExpDate = CryptoJS.AES.decrypt(selectedOrderForEdit.pay_method.ccexpdate, 'defaultkey');
              decryptedPayMethod.ccexpdate = JSON.parse(bytesExpDate.toString(CryptoJS.enc.Utf8));
              const bytesCvc = CryptoJS.AES.decrypt(selectedOrderForEdit.pay_method.cccvc, 'defaultkey');
              decryptedPayMethod.cccvc = JSON.parse(bytesCvc.toString(CryptoJS.enc.Utf8));
              const bytesZip = CryptoJS.AES.decrypt(selectedOrderForEdit.pay_method.cczip, 'defaultkey');
              decryptedPayMethod.cczip = JSON.parse(bytesZip.toString(CryptoJS.enc.Utf8));
            } catch (error) {
              console.error('Error decrypting payment data:', error);
              // Keep encrypted if decryption fails
            }
          } else {
            // If paid, mask the sensitive fields
            decryptedPayMethod.ccnumber = maskCardNumber(selectedOrderForEdit.pay_method.ccnumber);
            decryptedPayMethod.ccexpdate = maskExpDate(selectedOrderForEdit.pay_method.ccexpdate);
            decryptedPayMethod.cccvc = maskCVC(selectedOrderForEdit.pay_method.cccvc);
            decryptedPayMethod.cczip = maskZIP(selectedOrderForEdit.pay_method.cczip);
          }
        }
        setPayMethod({
          type: String(decryptedPayMethod.type || ''),
          ccname: String(decryptedPayMethod.ccname || ''),
          ccnumber: String(decryptedPayMethod.ccnumber || ''),
          ccexpdate: String(decryptedPayMethod.ccexpdate || ''),
          cccvc: String(decryptedPayMethod.cccvc || ''),
          cczip: String(decryptedPayMethod.cczip || ''),
          refpay: String(decryptedPayMethod.refpay || ''),
          status: decryptedPayMethod.status || 0,
        });
      }
      setShowCustomerForm(false); // Asumir que el cliente ya existe
    }
  }, [selectedOrderForEdit]);

  const fetchOrders = async () => {
    const params: any = {
      search: orderSearch,
      page: currentPage,
      status: filterStatus,
      brand: filterBrand,
      model: filterModel,
      prod_type: filterProdType,
      date_from: filterDateFrom,
      date_to: filterDateTo,
      archived: showArchived ? 1 : 0,
      limit: recordsPerPage
    };
    const { data } = await axios.get(`${API_URL}/api/orders`, { params });
    setOrders(data.orders);
    setTotalOrders(data.total || data.orders.length);
  };

  const fetchCustomers = async () => {
    const { data } = await axios.get(`${API_URL}/api/customers`);
    setCustomers(data.customers);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handlePayMethodChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPayMethod({ ...payMethod, [e.target.name]: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setStatus({ ...status, [e.target.name]: e.target.value });
  };

  const handleCoreToggle = () => {
    setForm(prev => {
      const newCore = prev.core ? 0 : 1;
      return {
        ...prev,
        core: newCore,
        core_amount: newCore === 0 ? '150' : ''
      };
    });
  };

  const handleShippingToggle = () => {
    const newShipping = form.shipping ? 0 : 1;
    setForm({
      ...form,
      shipping: newShipping,
      shipp_add: newShipping ? form.shipp_add : ''
    });
  };

  const handleCustomerSelect = (c: any) => {
    setCustomerId(c.id);
    setCustomerSearch(`${c.fname} ${c.lname} ${c.wapp} ${c.imsg}`);
    setFilteredCustomers([]);
    setShowCustomerForm(false);
  };

  const handleSubmit = async (e: React.FormEvent, securePayMethod?: PayMethod) => {
    e.preventDefault();

    // Enviar método de pago a pay_method y tipo de pago + opción a status_orders
    let paymentDescription = '';
    switch (payMethod.type) {
      case 'Verify Credit Card Pay 💳':
        paymentDescription = 'Verify Credit Card Payment';
        break;
      case 'Verify Zelle Payment 💰':
        paymentDescription = 'Verify Zelle Payment';
        break;
      case 'Verify CashApp Payment 💰':
        paymentDescription = 'Verify CashApp Payment';
        break;
      case 'Verify In-Person Pay 👤':
        paymentDescription = 'Verify In-Person Payment';
        break;
      default:
        paymentDescription = payMethod.type;
    }

    const payload: any = {
      ...form,
      pay_method: securePayMethod || payMethod, // tabla pay_method
      status: {
        status: payMethod.type, // tipo de pago como estatus principal
        description: paymentDescription, // descripción personalizada
        user_init: userId,
        payment_option: payMethod.type // puedes ajustar el nombre si la API lo requiere
      }, // tabla status_orders
    };

    payload.core_amount = form.core === 1 ? null : parseFloat(form.core_amount);

    if (showCustomerForm) {
      payload.customer = customer;
    } else {
      payload.customer_id = customerId;
    }

    // Handle empty ordermiles
    if (payload.ordermiles === '') payload.ordermiles = null;

    const res = await axios.post(`${API_URL}/api/orders/full`, payload);
    const newOrderId = res.data.orderId;

    // Upload files if any
    if (newOrderFiles.length > 0 && newOrderId) {
      const formData = new FormData();
      formData.append('orderId', newOrderId);
      for (let i = 0; i < newOrderFiles.length; i++) {
        formData.append('files', newOrderFiles[i]);
      }
      try {
        await axios.post(`${API_URL}/api/orders/${newOrderId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (uploadErr) {
        console.error('Error uploading attachments:', uploadErr);
        // Optional: show a warning distinct from success message
      }
    }

    setForm(initialForm);
    setCustomer(initialCustomer);
    setPayMethod(initialPayMethod);
    setStatus(initialStatus);
    setCustomerId('');
    setCustomerSearch('');
    setNewOrderFiles([]); // Reset files
    setShowCustomerForm(false);
    setShowOrderModal(false); // Cierra el modal
    setSuccessMsg('Order created successfully!');
    setTimeout(() => setSuccessMsg(''), 3500);
    fetchOrders();
  };

  const handleEditSubmit = async (e: React.FormEvent, securePayMethod?: PayMethod) => {
    e.preventDefault();

    if (!selectedOrderForEdit) return;

    const payload: any = {
      ...form,
      pay_method: securePayMethod || payMethod,
    };

    payload.core_amount = form.core === 1 ? null : parseFloat(form.core_amount);

    if (showCustomerForm) {
      payload.customer = customer;
    } else {
      payload.customer_id = customerId;
    }

    // Handle empty ordermiles
    if (payload.ordermiles === '') payload.ordermiles = null;

    await axios.put(`${API_URL}/api/orders/${selectedOrderForEdit.id}`, payload);

    // Upload files if any
    if (newOrderFiles.length > 0) {
      const formData = new FormData();
      formData.append('orderId', selectedOrderForEdit.id);
      for (let i = 0; i < newOrderFiles.length; i++) {
        formData.append('files', newOrderFiles[i]);
      }
      try {
        await axios.post(`${API_URL}/api/orders/${selectedOrderForEdit.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (uploadErr) {
        console.error('Error uploading attachments:', uploadErr);
      }
    }

    setShowEditModal(false);
    setNewOrderFiles([]); // Reset files
    setSuccessMsg('Order updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3500);
    fetchOrders();
  };

  // Consultar datos del VIN
  const handleVinLookup = async () => {
    setVinLoading(true);
    setVinError('');
    setVinData(null);
    try {
      const vin = form.vin_nr.trim();
      if (!vin || vin.length < 11) {
        setVinError('Invalid VIN or too short');
        setVinLoading(false);
        setVinModalOpen(true);
        return;
      }
      const res = await axios.get(`${API_URL}/api/vehicle/decodevin/${vin}`);
      if (res.data && res.data.Results && res.data.Results[0]) {
        setVinData(res.data.Results[0]);
      } else {
        setVinError('No se encontraron datos para ese VIN');
      }
    } catch (err) {
      setVinError('Error consultando el VIN');
    }
    setVinLoading(false);
    setVinModalOpen(true);
  };

  // Pegar datos del VIN al formulario principal
  const handlePasteVinData = () => {
    if (!vinData) return;
    setForm(f => ({
      ...f,
      brand: vinData.Make || f.brand,
      model: vinData.Model || f.model,
      year: vinData.ModelYear || f.year,
      drive_type: vinData.DriveType || f.drive_type,
      prod_type: f.prod_type,
      disp_liter: vinData.DisplacementL || f.disp_liter,
      cylinders: vinData.EngineCylinders || f.cylinders
    }));
    setVinModalOpen(false);
  };

  // Cerrar modal con X o Esc
  // Cerrar modal de orden y VIN con Esc
  useEffect(() => {
    if (!showOrderModal && !vinModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (vinModalOpen) setVinModalOpen(false);
        else if (showOrderModal) setShowOrderModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showOrderModal, vinModalOpen]);

  // Descargar reporte Excel (.xlsx) de órdenes filtradas
  const handleDownloadExcel = () => {
    if (!paginatedOrders || paginatedOrders.length === 0) return;
    // Selecciona las columnas relevantes
    const data = paginatedOrders.map((order: any) => {
      const detalles = [];
      if (order.prod_type === 'Engine') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.disp_liter) detalles.push(`Liter: ${order.disp_liter}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
        if (order.cylinders) detalles.push(`Cyl: ${order.cylinders}`);
      } else if (order.prod_type === 'Transmission') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
        if (order.transmissionType) detalles.push(`Transmisión: ${order.transmissionType}`);
      } else if (order.prod_type === 'Differential') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
      }
      return {
        Date: order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '',
        Code: order.order_code.slice(-6),
        Customer: order.fname && order.lname ? `${order.fname} ${order.lname}` : order.customer_id,
        Year: order.year,
        Make: order.brand,
        Model: order.model,
        "Product Type": order.prod_type,
        Details: detalles.join(', '),
        Price: order.price,
        Status: order.status + (order.orderDescription ? ` - ${order.orderDescription}` : '')
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, 'orders_report.xlsx');
  };

  // Descargar reporte PDF de órdenes filtradas
  const handleDownloadPDFReport = () => {
    if (!paginatedOrders || paginatedOrders.length === 0) return;
    const doc = new jsPDF('landscape');
    // Construir cabeceras y filas manualmente para evitar error de tipo
    const headers = ['Date', 'Code', 'Customer', 'Year', 'Make', 'Model', 'Product Type', 'Details', 'Price', 'Status'];
    // Función para quitar emojis
    const removeEmojis = (str: string) => str?.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/gu, '');
    const rows = paginatedOrders.map((order: any) => {
      const detalles = [];
      if (order.prod_type === 'Engine') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.disp_liter) detalles.push(`Liter: ${order.disp_liter}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
        if (order.cylinders) detalles.push(`Cyl: ${order.cylinders}`);
      } else if (order.prod_type === 'Transmission') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
        if (order.transmissionType) detalles.push(`Transmission: ${order.transmissionType}`);
      } else if (order.prod_type === 'Differential') {
        if (order.ordermiles) detalles.push(`Miles: ${order.ordermiles}`);
        if (order.drive_type) detalles.push(`Drive: ${order.drive_type}`);
      }
      return [
        order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A',
        removeEmojis(order.order_code.slice(-6)),
        removeEmojis(order.fname && order.lname ? `${order.fname} ${order.lname}` : order.customer_id),
        order.year,
        removeEmojis(order.brand),
        removeEmojis(order.model),
        removeEmojis(order.prod_type),
        removeEmojis(detalles.join(', ')),
        order.price,
        removeEmojis(order.status + (order.orderDescription ? ` - ${order.orderDescription}` : ''))
      ];
    });
    doc.text('Orders Report', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [headers],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save('orders_report.pdf');
  };

  // Función para resetear filtros
  const handleResetFilters = () => {
    setOrderSearch('');
    setFilterStatus('');
    setFilterBrand('');
    setFilterModel('');
    setFilterProdType('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setShowArchived(false);
    setCurrentPage(1);
    setShowSearchInput(false);
    setShowFiltersModal(false);
  };

  // Función para obtener deliveries disponibles
  const fetchAvailableDeliveries = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/deliveries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAvailableDeliveries(response.data.deliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  // Función para obtener órdenes asignadas a una delivery
  const fetchAssignedOrdersForDelivery = async (deliveryId: number) => {
    try {
      const response = await axios.get(`${API_URL}/api/deliveries/${deliveryId}/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAssignedOrdersToDelivery(response.data.orders);
    } catch (error) {
      console.error('Error fetching assigned orders:', error);
      setAssignedOrdersToDelivery([]);
    }
  };

  // Función para asignar orden a una delivery existente
  const handleAssignToDelivery = async () => {
    if (!selectedDeliveryId) return;
    try {
      // Obtener órdenes actuales asignadas a la delivery
      const currentOrderIds = assignedOrdersToDelivery.map((order: any) => order.id);
      const newOrderIds = [selectedOrderForPOD.id];
      const allOrderIds = [...currentOrderIds, ...newOrderIds];
      await axios.put(`${API_URL}/api/deliveries/${selectedDeliveryId}/assign-orders`, { orderIds: allOrderIds }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setShowAssignToDeliveryModal(false);
      setSuccessMsg('Order assigned to delivery successfully');
      setTimeout(() => setSuccessMsg(''), 2500);
      fetchOrders();
    } catch (error) {
      console.error('Error assigning order:', error);
      setSuccessMsg('Error assigning order. Please try again.');
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  // Orders are already paginated from backend
  const paginatedOrders = orders;

  // Unique brands/models/types for filter dropdowns
  const brands = Array.from(new Set(orders.map((o: any) => o.brand).filter(Boolean)));
  const models = Array.from(new Set(orders.map((o: any) => o.model).filter(Boolean)));
  const prodTypes = Array.from(new Set(orders.map((o: any) => o.prod_type).filter(Boolean)));
  const statuses = STATUS_OPTIONS.map(s => s.status);

  const renderWarranty = (order: any) => {
    const warrantyStr = order.warranty;
    if (!warrantyStr || warrantyStr === 'No Warranty') {
      return <span>No Warranty</span>;
    }
    const match = warrantyStr.match(/(\d+) days/);
    const days = match ? parseInt(match[1]) : 0;
    if (days === 0) {
      return <span>No Warranty</span>;
    }
    const deliveryDate = order.deliveryproof_date ? new Date(order.deliveryproof_date) : null;
    if (!deliveryDate) {
      return <span><span className="inline-block w-4 h-4 rounded-full bg-yellow-500 mr-2" title="Waiting for delivery proof"></span>Pending</span>;
    }
    const expiryDate = new Date(deliveryDate);
    expiryDate.setDate(deliveryDate.getDate() + days);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      return <span><span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2" title="Under Warranty"></span>{daysLeft} days left</span>;
    } else {
      return <span><span className="inline-block w-4 h-4 rounded-full bg-red-500 mr-2" title="Warranty Expired"></span>Expired {Math.abs(daysLeft)} days ago</span>;
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white px-2">
      {successMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold transition-all">
          {successMsg}
        </div>
      )}
      <div className="bg-gray-200 dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-6xl mt-8">
        {/* Modal ver hoja de datos */}
        {showViewModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-2xl relative overflow-y-auto max-h-[90vh] modal-content" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowViewModal(false)}>×</button>
              <div className="order-data-sheet-content">
                <h1 className="text-xl font-bold mb-4 text-center">Order Data Sheet</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Order Code:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.order_code.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Customer:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.fname} {selectedOrder.lname}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Phone:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.wapp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">VIN:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.vin_nr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Make:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.brand}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Model:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Year:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.year}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Product Type:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.prod_type}</span>
                    </div>
                    {(selectedOrder.prod_type === 'Engine' || selectedOrder.prod_type === 'Transmission' || selectedOrder.prod_type === 'Differential') && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Drive Type:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.drive_type}</span>
                      </div>
                    )}
                    {(selectedOrder.prod_type === 'Transmission' || selectedOrder.prod_type === 'Differential') && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Transmission:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.transmissionType || '-'}</span>
                      </div>
                    )}
                    {(selectedOrder.prod_type === 'Engine' || selectedOrder.prod_type === 'Transmission' || selectedOrder.prod_type === 'Differential') && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Miles:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.ordermiles}</span>
                      </div>
                    )}
                    {selectedOrder.prod_type === 'Engine' && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Displacement (L):</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.disp_liter}</span>
                      </div>
                    )}
                    {selectedOrder.prod_type === 'Engine' && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Cylinders:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.cylinders}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Price:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Down Payment:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.down_pay}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Warranty:</span>
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white">{selectedOrder.warranty}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Warranty Status:</span>
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white">{renderWarranty(selectedOrder)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Stock #:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.stock_nr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Core:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.core ? 'Yes' : 'No'}</span>
                    </div>
                    {!selectedOrder.core && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Core Amount:</span>
                        <span className="text-gray-900 dark:text-white">{selectedOrder.core_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Shipping:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.shipping ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Shipping Address:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.shipping ? selectedOrder.shipp_add : ''}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Creation Date:</span>
                      <span className="text-gray-900 dark:text-white">{selectedOrder.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2 w-full">
                      <span className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Order Description:</span>
                      {/* Solo mostrar la descripción de la orden (orders.description), nunca la del status */}
                      <div className="bg-white dark:bg-gray-900 rounded p-3 text-gray-800 dark:text-gray-100 whitespace-pre-line border border-gray-200 dark:border-gray-700 min-h-[80px]">
                        {selectedOrder && typeof selectedOrder.orderDescription === 'string' && selectedOrder.orderDescription.trim() !== ''
                          ? selectedOrder.orderDescription
                          : <span className="italic text-gray-400">No description provided.</span>}
                      </div>
                    </div>
                    {/* Attachments Carousel moved here */}
                    {viewOrderAttachments && viewOrderAttachments.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow">
                        <AttachmentCarousel
                          attachments={viewOrderAttachments}
                          title="Order Attachments"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>


              <div className="flex justify-end gap-2 mb-4">
                <button className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 lg:hidden" onClick={handleShareScreenshot} title="Share Screenshot">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
                <button className="p-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={handleDownloadPDF} title="Download PDF">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
              {/* Bloque de registro de pago debajo de la descripción */}
              <div className="mt-4">
                {paymentMessage && (
                  <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded mb-2">
                    {paymentMessage}
                  </div>
                )}
                {selectedOrder.pay_method && selectedOrder.pay_method.status === 0 && userType !== '2' && userType !== '3' && (
                  <div className="flex justify-end mb-2">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleOpenRegisterPaymentModal}>
                      Register Payment
                    </button>
                  </div>
                )}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-2">Registered Payments</h3>
                    <ul className="space-y-2">
                      {selectedOrder.payments.map((pay: any, idx: number) => (
                        <li key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pay.type}</span>
                            {pay.status === 1 && (
                              <span className="text-green-600" title="Paid">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </span>
                            )}
                          </div>
                          <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => {
                            setShowPaymentInfoModal(true);
                            setPaymentInfoModalData(pay);
                          }}>View Info</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <hr className="my-4" />
              <h3 className="text-lg font-bold mb-2">Status History</h3>
              {orderStatusHistory.length === 0 ? (
                <div className="mb-2 text-gray-500">No status history available.</div>
              ) : (
                <div className="mb-2">
                  <table className="w-full text-sm bg-white dark:bg-gray-900 rounded shadow">
                    <thead>
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Description</th>
                        <th className="p-2">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderStatusHistory.map((stat, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{stat.datetime?.slice(0, 19).replace('T', ' ')}</td>
                          <td className="p-2">{stat.status}</td>
                          <td className="p-2">{stat.description}</td>
                          <td className="p-2">{stat.user_email || stat.user_init}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Paginación del historial de estatus */}
                  {statusTotal > STATUS_PAGE_SIZE && (
                    <div className="flex justify-center items-center gap-2 mt-2">
                      <button
                        className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        disabled={statusPage === 1}
                        onClick={() => handleStatusPageChange(statusPage - 1)}
                      >Prev</button>
                      <span className="px-2">Página {statusPage} de {Math.max(1, Math.ceil(statusTotal / STATUS_PAGE_SIZE))}</span>
                      <button
                        className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        disabled={statusPage >= Math.ceil(statusTotal / STATUS_PAGE_SIZE)}
                        onClick={() => handleStatusPageChange(statusPage + 1)}
                      >Next</button>
                    </div>
                  )}
                </div>
              )}
              {/* Permisos para botón Add New Status */}
              {(userType === '1' || userType === '2' || userType === '3') && (
                <button className="bg-blue-500 text-white px-4 py-2 rounded mt-2" onClick={() => {
                  setStatusInput('');
                  setStatusDescInput('');
                  setDeliveryDate('');
                  setShowStatusModal(true);
                }}>
                  + Add New Status
                </button>
              )}

              {/* Modal info de pago */}
              {showPaymentInfoModal && paymentInfoModalData && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowPaymentInfoModal(false)}>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowPaymentInfoModal(false)}>×</button>
                    <h2 className="text-xl font-bold mb-2">Payment Information</h2>
                    <div className="mb-2"><b>Type:</b> {paymentInfoModalData.type}</div>
                    <div className="mb-2"><b>Reference:</b> {paymentInfoModalData.refpay}</div>
                    {paymentInfoModalData.ccname && (
                      <div className="mb-2"><b>Card Name:</b> {paymentInfoModalData.ccname}</div>
                    )}
                    {paymentInfoModalData.ccnumber && (
                      <div className="mb-2"><b>Card Number:</b> {paymentInfoModalData.status === 1 ? maskCardNumber(paymentInfoModalData.ccnumber) : paymentInfoModalData.ccnumber}</div>
                    )}
                    <div className="mb-2"><b>Status:</b> {paymentInfoModalData.status === 1 ? <span className="text-green-600 font-bold">Paid</span> : <span className="text-yellow-600 font-bold">Pending</span>}</div>
                    {/* Preview comprobante */}
                    {paymentInfoModalData.doc_path && (
                      <div className="mb-2">
                        <b>Receipt:</b>
                        <div className="mt-2">
                          {paymentInfoModalData.doc_path.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img src={`${(paymentInfoModalData.doc_url && paymentInfoModalData.doc_url.startsWith('http')) ? paymentInfoModalData.doc_url : `${API_URL}${paymentInfoModalData.doc_url || `/api/${paymentInfoModalData.doc_path}`}`}?token=${localStorage.getItem('token')}`} alt="Receipt" className="max-w-full max-h-48 rounded border" />
                          ) : (
                            <a href={`${(paymentInfoModalData.doc_url && paymentInfoModalData.doc_url.startsWith('http')) ? paymentInfoModalData.doc_url : `${API_URL}${paymentInfoModalData.doc_url || `/api/${paymentInfoModalData.doc_path}`}`}?token=${localStorage.getItem('token')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download Receipt</a>
                          )}
                        </div>
                        <div className="mt-2">
                          <a href={`${(paymentInfoModalData.doc_url && paymentInfoModalData.doc_url.startsWith('http')) ? paymentInfoModalData.doc_url : `${API_URL}${paymentInfoModalData.doc_url || `/api/${paymentInfoModalData.doc_path}`}`}?token=${localStorage.getItem('token')}`} download className="bg-blue-500 text-white px-3 py-1 rounded">Download</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Modal para registro de pago */}
        {showRegisterPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowRegisterPaymentModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-2">Register Payment</h2>
              <p className="mb-2 text-gray-700 dark:text-gray-200">You are about to register a payment for this order.</p>
              {registerPaymentSuccess && <div className="bg-green-500 text-white px-4 py-2 rounded mb-2">{registerPaymentSuccess}</div>}
              {registerPaymentError && <div className="bg-red-500 text-white px-4 py-2 rounded mb-2">{registerPaymentError}</div>}
              {/* Información de pago editable y comprobante */}
              <div className="space-y-2">
                <div className="font-semibold">{registerPaymentPayMethod?.type}</div>
                {registerPaymentPayMethod?.type === 'Verify Credit Card Pay 💳' && (
                  <div>{registerPaymentPayMethod.ccname} - {registerPaymentPayMethod.status === 1 ? maskCardNumber(registerPaymentPayMethod.ccnumber) : registerPaymentPayMethod.ccnumber}</div>
                )}
                {registerPaymentPayMethod?.type === 'Verify Credit Card Pay 💳' && (
                  <div>CVC: {registerPaymentPayMethod.status === 1 ? maskCVC(registerPaymentPayMethod.cccvc) : registerPaymentPayMethod.cccvc} | ZIP: {registerPaymentPayMethod.status === 1 ? maskZIP(registerPaymentPayMethod.cczip) : registerPaymentPayMethod.cczip}</div>
                )}
                {/* Reference input shown only for non-cash payment methods */}
                {registerPaymentPayMethod?.type !== 'Verify In-Person Pay 👤' && (
                  <input type="text" className="p-2 rounded border w-full" placeholder="Reference" value={paymentRefInput} onChange={e => setPaymentRefInput(e.target.value)} />
                )}
                {/* Checkbox to mark Cash In Person as paid */}
                {registerPaymentPayMethod?.type === 'Verify In-Person Pay 👤' && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={payInPersonChecked} onChange={e => setPayInPersonChecked(e.target.checked)} />
                    Mark as paid
                  </label>
                )}
                {/* Comprobante siempre visible */}
                <div>
                  <label className="block mb-1">Upload transaction receipt:</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={async e => {
                      const file = e.target.files?.[0] || null;
                      setPaymentFile(file);
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded" disabled={registerPaymentLoading} onClick={handleRegisterPayment}>
                  {registerPaymentLoading ? 'Processing...' : 'Register Payment'}
                </button>
                <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowRegisterPaymentModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Modal agregar/editar estatus */}
        {showStatusModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowStatusModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowStatusModal(false)}>×</button>
              <h2 className="text-xl font-bold mb-2">Add New Status</h2>
              <div className="mb-2"><b>Order:</b> {selectedOrder.order_code}</div>
              <select value={statusInput} onChange={e => setStatusInput(e.target.value)} className="p-2 rounded border w-full mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Select Status</option>
                {/* Filtrar status según tipo de usuario */}
                {userType === '2' && (
                  <>
                    <option value="Claim Filed 📝">Claim Filed 📝</option>
                  </>
                )}
                {userType === '3' && (
                  <>
                    <option value="Preparing Item 🫳🏼">Preparing Item 🫳🏼</option>
                    <option value="Ready for Pickup 📦">Ready for Pickup 📦</option>
                    <option value="Picked Up 🚗">Picked Up 🚗</option>
                    <option value="Shipped 🚚">Shipped 🚚</option>
                  </>
                )}
                {userType === '1' && (
                  <>
                    {statuses.filter(s => !['Verify Credit Card Pay 💳', 'Verify Zelle Payment 💰', 'Verify CashApp Payment 💰', 'Verify In-Person Pay 👤', 'Paid ✅'].includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                  </>
                )}
              </select>
              <textarea
                value={statusDescInput}
                onChange={e => setStatusDescInput(e.target.value)}
                className="p-2 rounded border w-full mb-4"
                placeholder="Status Description"
                rows={3} required
              />
              {statusInput === 'Picked Up 🚗' && (
                <div className="mb-4">
                  <label className="block mb-1">Picked Up Date:</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="p-2 rounded border w-full"
                    required
                  />
                </div>
              )}
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={async () => {
                await handleSaveStatus();
                // Refrescar historial de estatus después de guardar
                await loadStatusHistory(selectedOrder.id, statusPage);
              }}>Save</button>
            </div>
          </div>
        )}
        {/* Modal de filtros */}
        {showFiltersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowFiltersModal(false)}>
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-4xl relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold" onClick={() => setShowFiltersModal(false)}>×</button>
              <h2 className="text-xl font-bold mb-4">Filters</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">All Status</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterModel} onChange={e => setFilterModel(e.target.value)} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">All Models</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterProdType} onChange={e => setFilterProdType(e.target.value)} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">All Product Types</option>
                  {prodTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <div className="flex gap-2 items-center">
                  <label className="text-sm">From:</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="p-2 rounded border" />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm">To:</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="p-2 rounded border" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setShowFiltersModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold text-center">Orders</h1>
          <div className="flex items-center gap-4">
            {/* Mostrar botón New Order solo para Operador y SAdmin */}
            {(userType === '2' || userType === '1') && (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                onClick={() => setShowOrderModal(true)}
              >
                + New Order
              </button>
            )}
            {/* Botones de descarga de reporte PDF y Excel */}
            <button
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
              onClick={handleDownloadExcel}
              title="Download Excel"
            >
              Download Excel
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700"
              onClick={handleDownloadPDFReport}
              title="Download PDF"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <h2 className="text-xl font-bold">Order List</h2>
              <button onClick={() => setShowSearchInput(!showSearchInput)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Search">
                🔍
              </button>
            </div>
            {showSearchInput && (
              <input
                type="text"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                placeholder="Search by order code, name, surname, phone"
                className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-64 mt-2 sm:mt-0"
                autoComplete="off"
              />
            )}
            <div className="flex flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button onClick={() => setShowFiltersModal(true)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 w-full sm:w-auto" title="Filters">
                Filters
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button onClick={handleResetFilters} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 w-full sm:w-auto" title="Reset Filters">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
              <div className="flex items-center gap-2">
                <label className="text-sm">Records:</label>
                <select value={recordsPerPage} onChange={e => { setRecordsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 border rounded px-2 py-1 w-full sm:w-auto">
              <label className="flex items-center gap-2 w-full sm:w-auto">
                <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                <span className="text-sm">Auto-refresh every 5 seconds</span>
              </label>
              {!autoRefresh && (
                <button onClick={fetchOrders} className="px-3 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 w-full sm:w-auto" title="Refresh">
                  <svg width="24px" height="24px" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M12 2.181a.75.75 0 0 1 1.177-.616l4.432 3.068a.75.75 0 0 1 0 1.234l-4.432 3.068A.75.75 0 0 1 12 8.32V6a7 7 0 1 0 7 7 1 1 0 1 1 2 0 9 9 0 1 1-9-9V2.181z" fill="#000000" /></svg>
                  Refresh Now
                </button>
              )}
            </div>
            {userType === '1' && (
              <div className="flex items-center gap-2 border rounded px-2 py-1 w-full sm:w-auto">
                <label className="flex items-center gap-2 w-full sm:w-auto">
                  <input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setCurrentPage(1); }} />
                  <span>Show Stored Orders</span>
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white dark:bg-gray-900 rounded shadow min-w-[800px]">
            <thead>
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Code</th>
                {userType !== '3' && <th className="p-2">Customer</th>}
                <th className="p-2">Year</th>
                <th className="p-2">Make</th>
                <th className="p-2">Model</th>
                <th className="p-2">Product Type</th>
                <th className="p-2">Price</th>
                <th className="p-2">Warranty</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr><td colSpan={userType === '3' ? 9 : 10} className="p-4 text-center text-gray-500">No orders found.</td></tr>
              ) : (
                paginatedOrders.map((order: any) => (
                  <tr key={order.id} className={
                    order.status === 'Claim Filed 📝' ? 'bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg' :
                      order.status === 'Paid ✅' ? 'bg-green-50 dark:bg-green-950 border border-green-200 rounded-lg' :
                        order.status === 'Pending 🕒' ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-lg' : ''
                  }>
                    <td className="p-2">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}</td>
                    <td className="p-2">{order.order_code.slice(-6)}</td>
                    {userType !== '3' && <td className="p-2">{order.fname && order.lname ? `${order.fname} ${order.lname}` : order.customer_id}</td>}
                    <td className="p-2">{order.year}</td>
                    <td className="p-2">{order.brand}</td>
                    <td className="p-2">{order.model}</td>
                    <td className="p-2">{(() => {
                      if (order.prod_type === 'Engine') {
                        return (
                          <>
                            {order.prod_type}
                            {order.disp_liter && <>  <span className="text-xs">{order.disp_liter}L</span></>}
                            {order.cylinders && <>  <span className="text-xs">{order.cylinders}Cyl</span></>}
                          </>
                        );
                      } else if (order.prod_type === 'Transmission') {
                        return (
                          <>
                            {order.prod_type}
                            {order.transmissionType && <>  <span className="text-xs">{order.transmissionType}</span></>}
                          </>
                        );
                      } else if (order.prod_type === 'Differential') {
                        return (
                          <>
                            {order.prod_type}
                            {order.drive_type && <>  <span className="text-xs">{order.drive_type}</span></>}
                          </>
                        );
                      } else {
                        return order.prod_type;
                      }
                    })()}</td>
                    <td className="p-2">{order.price}</td>
                    <td className="p-2 text-xs">{renderWarranty(order)}</td>
                    <td className="p-2">
                      {order.status}
                      {order.status_orders?.description ? (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{order.status_orders?.description}</span>
                      ) : null}
                    </td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                        onClick={() => handleViewOrder(order)}
                        title="Ver"
                        aria-label="Ver"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        onClick={() => handleEditStatus(order)}
                        title="Estatus"
                        aria-label="Estatus"
                      >
                        {/* Icono de estatus: lista/checklist */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 8h10M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                      {userType === '1' && (
                        <button
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                          onClick={() => { setSelectedOrderForEdit(order); setShowEditModal(true); }}
                          title="Edit"
                          aria-label="Edit"
                        >
                          {/* Icono de editar: lápiz */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {userType === '1' && (
                        <>
                          {showArchived ? (
                            <button
                              className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                              onClick={() => handleArchiveOrder(order.id, true)}
                              title="Restore Order"
                              aria-label="Restore Order"
                            >
                              {/* Icono recuperar: flecha circular */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20a8 8 0 0116-16" /></svg>
                            </button>
                          ) : (
                            <button
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                              onClick={() => handleArchiveOrder(order.id, false)}
                              title="Store Order"
                              aria-label="Store Order"
                            >
                              {/* Icono archivar: caja/archivo */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="7" width="18" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3v4M8 3v4M4 7h16" /></svg>
                            </button>
                          )}
                        </>
                      )}
                      {(order.status === 'Ready for Pickup 📦' || order.status === 'Preparing Item 🫳🏼' || order.status === 'Shipped 🚚') && order.shipping == 1 && userType !== '2' && (
                        <button
                          className={`p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900 ${order.status === 'Shipped 🚚' ? 'text-green-500' : 'text-yellow-500'}`}
                          onClick={() => { setSelectedOrderForPOD(order); setShowProofOfDeliveryModal(true); }}
                          title="Proof of Delivery"
                          aria-label="Proof of Delivery"
                        >
                          {/* Icono de entrega: camión o paquete */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </button>
                      )}
                      {/* Modal de confirmación para archivar orden */}
                      {archiveModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => { setArchiveModalOpen(false); setArchiveOrderId(null); }}>
                          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                            <button
                              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
                              onClick={() => { setArchiveModalOpen(false); setArchiveOrderId(null); }}
                              title="Cerrar"
                            >×</button>
                            <h2 className="text-xl font-bold mb-4 text-center">
                              {archiveAction === 'archive' ? 'Confirmar archivo de orden' : 'Confirmar recuperación de orden'}
                            </h2>
                            <p className="mb-4 text-center">
                              {archiveAction === 'archive'
                                ? '¿Seguro que deseas archivar esta orden? Esta acción no se puede deshacer.'
                                : '¿Seguro que deseas recuperar esta orden y volver a ponerla activa?'}
                            </p>
                            <div className="flex justify-center gap-4">
                              <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setArchiveModalOpen(false); setArchiveOrderId(null); }}>Cancelar</button>
                              <button className={archiveAction === 'archive' ? "bg-red-600 text-white px-4 py-2 rounded" : "bg-green-600 text-white px-4 py-2 rounded"} onClick={confirmArchiveOrder}>
                                {archiveAction === 'archive' ? 'Store' : 'Restore'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >Prev</button>
          <span className="px-2">Page {currentPage} of {Math.max(1, Math.ceil(totalOrders / recordsPerPage))}</span>
          <button
            className="px-2 py-1 rounded bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={currentPage >= Math.ceil(totalOrders / recordsPerPage)}
            onClick={() => setCurrentPage(currentPage + 1)}
          >Next</button>
        </div>
      </div>

      {/* Modal para editar orden */}
      {showEditModal && selectedOrderForEdit && userType === '1' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-5xl relative" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
              onClick={() => setShowEditModal(false)}
              title="Close"
            >×</button>
            <h1 className="text-2xl font-bold mb-4 text-center">Edit Order</h1>
            <OrderForm
              isEdit={true}
              orderId={selectedOrderForEdit.id}
              userType={userType}
              form={form}
              setForm={setForm}
              customer={customer}
              setCustomer={setCustomer}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              status={status}
              setStatus={setStatus}
              customerId={customerId}
              setCustomerId={setCustomerId}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              filteredCustomers={filteredCustomers}
              setFilteredCustomers={setFilteredCustomers as React.Dispatch<React.SetStateAction<any[]>>}
              showCustomerForm={showCustomerForm}
              setShowCustomerForm={setShowCustomerForm}
              autoSearchLoading={autoSearchLoading}
              autoSearchError={autoSearchError}
              handleFormChange={handleFormChange}
              handleCustomerChange={handleCustomerChange}
              handlePayMethodChange={handlePayMethodChange}
              handleStatusChange={handleStatusChange}
              handleCoreToggle={handleCoreToggle}
              handleShippingToggle={handleShippingToggle}
              handleCustomerSelect={handleCustomerSelect}
              handleSubmit={handleEditSubmit}
              handleVinLookup={handleVinLookup}
              handleCardNumberChange={handleCardNumberChange}
              handleExpMonthChange={handleExpMonthChange}
              handleExpYearChange={handleExpYearChange}
              handleCvcChange={handleCvcChange}
              cardCompany={cardCompany}
              cardLogos={cardLogos}
              PAYMENT_TYPES={PAYMENT_TYPES}
              STATUS_OPTIONS={STATUS_OPTIONS}
              files={newOrderFiles}
              setFiles={setNewOrderFiles}
            />
            <style>{`
              .switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 22px;
              }
              .switch input {display:none;}
              .slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 22px;
              }
              .switch input:checked + .slider {
                background-color: #4ade80;
              }
              .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
              }
              .switch input:checked + .slider:before {
                transform: translateX(18px);
              }
            `}</style>
            <VinModal
              vinModalOpen={vinModalOpen}
              setVinModalOpen={setVinModalOpen}
              vinLoading={vinLoading}
              vinError={vinError}
              vinData={vinData}
              handlePasteVinData={handlePasteVinData}
            />
          </div>
        </div>
      )}

      {/* Modal for order creation */}
      {/* Mostrar modal sólo para Operador y SAdmin */}
      {showOrderModal && (userType === '2' || userType === '1') && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowOrderModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-5xl relative" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
              onClick={() => setShowOrderModal(false)}
              title="Close"
            >×</button>
            <h1 className="text-2xl font-bold mb-4 text-center">New Order</h1>
            <OrderForm
              isEdit={false}
              userType={userType}
              form={form}
              setForm={setForm}
              customer={customer}
              setCustomer={setCustomer}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              status={status}
              setStatus={setStatus}
              customerId={customerId}
              setCustomerId={setCustomerId}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              filteredCustomers={filteredCustomers}
              setFilteredCustomers={setFilteredCustomers as React.Dispatch<React.SetStateAction<any[]>>}
              showCustomerForm={showCustomerForm}
              setShowCustomerForm={setShowCustomerForm}
              autoSearchLoading={autoSearchLoading}
              autoSearchError={autoSearchError}
              handleFormChange={handleFormChange}
              handleCustomerChange={handleCustomerChange}
              handlePayMethodChange={handlePayMethodChange}
              handleStatusChange={handleStatusChange}
              handleCoreToggle={handleCoreToggle}
              handleShippingToggle={handleShippingToggle}
              handleCustomerSelect={handleCustomerSelect}
              handleSubmit={handleSubmit}
              handleVinLookup={handleVinLookup}
              handleCardNumberChange={handleCardNumberChange}
              handleExpMonthChange={handleExpMonthChange}
              handleExpYearChange={handleExpYearChange}
              handleCvcChange={handleCvcChange}
              cardCompany={cardCompany}
              cardLogos={cardLogos}

              PAYMENT_TYPES={PAYMENT_TYPES}
              STATUS_OPTIONS={STATUS_OPTIONS}
              files={newOrderFiles}
              setFiles={setNewOrderFiles}
            />
            <style>{`
              .switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 22px;
              }
              .switch input {display:none;}
              .slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 22px;
              }
              .switch input:checked + .slider {
                background-color: #4ade80;
              }
              .slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
              }
              .switch input:checked + .slider:before {
                transform: translateX(18px);
              }
            `}</style>
            <VinModal
              vinModalOpen={vinModalOpen}
              setVinModalOpen={setVinModalOpen}
              vinLoading={vinLoading}
              vinError={vinError}
              vinData={vinData}
              handlePasteVinData={handlePasteVinData}
            />
          </div>
        </div>
      )}

      {/* Modal Proof of Delivery */}
      {showProofOfDeliveryModal && selectedOrderForPOD && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print-modal" onClick={() => setShowProofOfDeliveryModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto print-content" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold print-hide"
              onClick={() => setShowProofOfDeliveryModal(false)}
              title="Close"
            >×</button>
            <h2 className="text-left font-bold text-xl mb-2">Proof Of Delivery</h2>
            <hr className="border-black mb-2" />
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="col-span-2 border-r border-black pr-4">
                <p className="mb-1 flex justify-between"><span><strong>Order:</strong> {selectedOrderForPOD.order_code ? selectedOrderForPOD.order_code.slice(-6) : 'N/A'}</span><span><strong>Date:</strong> {selectedOrderForPOD.created_at ? new Date(selectedOrderForPOD.created_at).toLocaleDateString('en-US') : 'N/A'}</span></p>
                <p className="mb-1"><strong>Customer:</strong> {selectedOrderForPOD.fname && selectedOrderForPOD.lname ? `${selectedOrderForPOD.fname} ${selectedOrderForPOD.lname}` : 'N/A'}</p>
                <p className="mb-1"><strong>Phone:</strong> {selectedOrderForPOD.wapp || 'N/A'}</p>
                <p className="mb-1"><strong>Address:</strong> {selectedOrderForPOD.shipp_add || 'N/A'}</p>
                <p className="mb-1"><strong>Item:</strong> {selectedOrderForPOD.prod_type || 'N/A'} <strong> Make:</strong> {selectedOrderForPOD.brand || 'N/A'}</p>
                <p className="mb-1"><strong>Model:</strong> {selectedOrderForPOD.model || 'N/A'} <strong> Year:</strong> {selectedOrderForPOD.year || 'N/A'}</p>
                <p className="mb-1"><strong>Warranty:</strong> {selectedOrderForPOD.warranty || 'N/A'}</p>
              </div>
              <div className="col-span-1">
                <p className="mb-1"><strong>Item Price:</strong> ${selectedOrderForPOD.price}</p>
                {selectedOrderForPOD.core === 0 && selectedOrderForPOD.core_amount > 0 && <p className="mb-1"><strong>Core Charge:</strong> ${selectedOrderForPOD.core_amount}</p>}
                <p className="mb-1"><strong>Down Payment:</strong> -${selectedOrderForPOD.down_pay}</p>
                <hr className="border-black my-2" />
                <p className="mb-1"><strong>Total to Pay:</strong> ${(selectedOrderForPOD.price + (selectedOrderForPOD.core_amount || 0) - selectedOrderForPOD.down_pay).toFixed(2)}</p>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                  onClick={() => setShowDeliveryOptionsModal(true)}
                >
                  {selectedOrderForPOD.deliveryproof_date ? 'Modify Delivery Details' : 'Add Delivery Details'}
                </button>
              </div>
            </div>
            <hr className="border-black mb-2" />
            {/* Delivery Proof Section */}
            {selectedOrderForPOD.status === 'Shipped 🚚' ? (
              <>
                {selectedOrderForPOD.deliveryproof_docpath && (
                  <div className="mb-4">
                    <h3 className="font-bold mb-2">Delivery Proof</h3>
                    <p className="mb-2"><strong>Delivery Date:</strong> {selectedOrderForPOD.deliveryproof_date ? new Date(selectedOrderForPOD.deliveryproof_date).toLocaleDateString() : 'N/A'}</p>
                    <img src={`${API_URL}/api/${selectedOrderForPOD.deliveryproof_docpath}?token=${localStorage.getItem('token')}`} alt="Delivery Proof" className="max-w-full max-h-48 border rounded mb-2" />
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
                      onClick={() => window.open(`${API_URL}/api/${selectedOrderForPOD.deliveryproof_docpath}?token=${localStorage.getItem('token')}`, '_blank')}
                    >
                      Download Proof
                    </button>
                  </div>
                )}
                {!selectedOrderForPOD.deliveryproof_docpath && (
                  <div className="mb-4 print-hide">
                    <h3 className="font-bold mb-2">Upload receipt after Delivery</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <input type="file" accept="image/*" onChange={handlePodFileChange} className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-auto" />
                      <div className="flex flex-col gap-2">
                        <label className="text-sm">Delivery Date:</label>
                        <input type="date" value={podDate} onChange={e => setPodDate(e.target.value)} className="p-2 rounded border" />
                      </div>
                    </div>
                    {podThumbnail && (
                      <div className="mb-2">
                        <label className="text-sm block mb-1">Delivery Proof Preview:</label>
                        <img src={podThumbnail} alt="Thumbnail" className="max-w-full max-h-48 border rounded" />
                      </div>
                    )}
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded"
                      onClick={handlePodUpload}
                      disabled={!podFile || podUploading}
                    >
                      {podUploading ? 'Uploading...' : 'Upload Proof'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-600">Print for delivery, return signed with date and time of delivery.</p>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
                  onClick={() => {
                    const doc = new jsPDF({
                      orientation: 'landscape',
                      unit: 'pt',
                      format: [612, 450] // Adjusted height for better spacing
                    });

                    // --- DOCUMENT HEADER ---
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(20);
                    doc.text('Proof Of Delivery', 20, 40);
                    doc.line(20, 50, 592, 50); // Top horizontal separator

                    // --- LEFT COLUMN ---
                    let y = 75; // Initial Y position for content
                    const leftMargin = 20;
                    const rightColumnX = 410;

                    // Order
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Order No:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.order_code ? selectedOrderForPOD.order_code.slice(-6) : 'N/A', 75, y);

                    doc.setFont('helvetica', 'bold');
                    doc.text('Date:', 150, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.created_at ? new Date(selectedOrderForPOD.created_at).toLocaleDateString('en-US') : 'N/A', 180, y);

                    y += 25;

                    // Customer
                    doc.setFont('helvetica', 'bold');
                    doc.text('Customer:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    const customerName = selectedOrderForPOD.fname && selectedOrderForPOD.lname ?
                      `${selectedOrderForPOD.fname} ${selectedOrderForPOD.lname}` : 'N/A';
                    doc.text(customerName, 80, y);

                    y += 25;

                    // Phone
                    doc.setFont('helvetica', 'bold');
                    doc.text('Phone:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text((selectedOrderForPOD.wapp || selectedOrderForPOD.imsg) || 'N/A', 60, y);

                    y += 25;

                    // Address
                    doc.setFont('helvetica', 'bold');
                    doc.text('Address:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.shipp_add || 'N/A', 75, y);

                    y += 25;

                    // Item Details (Item, Make, Model, Year)
                    doc.setFont('helvetica', 'bold');
                    doc.text('Item:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.prod_type || 'N/A', 55, y);

                    doc.setFont('helvetica', 'bold');
                    doc.text('Make:', 178, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.brand || 'N/A', 216, y);

                    y += 25;

                    doc.setFont('helvetica', 'bold');
                    doc.text('Model:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.model || 'N/A', 60, y);

                    doc.setFont('helvetica', 'bold');
                    doc.text('Year:', 250, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.year || 'N/A', 290, y);

                    y += 25;

                    // Warranty
                    doc.setFont('helvetica', 'bold');
                    doc.text('Warranty:', leftMargin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(selectedOrderForPOD.warranty || 'N/A', 85, y);

                    // --- RIGHT COLUMN ---
                    let rightY = 75; // Reset Y for the right column
                    const valueX = 580; // X position for right-aligned values

                    // Item Price
                    doc.setFont('helvetica', 'bold');
                    doc.text('Item Price:', rightColumnX, rightY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`$${(selectedOrderForPOD.price || 0).toFixed(2)}`, valueX, rightY, { align: 'right' });

                    rightY += 25;

                    // Core Charge
                    if (selectedOrderForPOD.core === 0 && selectedOrderForPOD.core_amount > 0) {
                      doc.setFont('helvetica', 'bold');
                      doc.text('Core Charge:', rightColumnX, rightY);
                      doc.setFont('helvetica', 'normal');
                      doc.text(`$${(selectedOrderForPOD.core_amount || 0).toFixed(2)}`, valueX, rightY, { align: 'right' });
                      rightY += 25;
                    }

                    // Down Payment
                    doc.setFont('helvetica', 'bold');
                    doc.text('Down Payment:', rightColumnX, rightY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`-$${(selectedOrderForPOD.down_pay || 0).toFixed(2)}`, valueX, rightY, { align: 'right' });

                    rightY += 15;
                    doc.line(rightColumnX, rightY, 580, rightY); // Right column separator
                    rightY += 25;

                    // Total to Pay
                    const total = (selectedOrderForPOD.price || 0) + (selectedOrderForPOD.core_amount || 0) - (selectedOrderForPOD.down_pay || 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Total to Pay:', rightColumnX, rightY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`$${total.toFixed(2)}`, valueX, rightY, { align: 'right' });


                    // --- SEPARATORS ---
                    const verticalLineX = 390;
                    const contentHeight = Math.max(y, rightY); // Get the max height of the content
                    doc.line(verticalLineX, 55, verticalLineX, contentHeight + 10); // Vertical separator

                    const bottomLineY = contentHeight + 30;
                    doc.line(20, bottomLineY, 592, bottomLineY); // Bottom horizontal separator


                    // --- SIGNATURE AREA ---
                    const signatureY = bottomLineY + 40;
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Signature:', 40, signatureY);
                    doc.line(110, signatureY, 250, signatureY); // Line for signature

                    doc.text('Date:', 280, signatureY);
                    doc.line(320, signatureY, 450, signatureY); // Line for date

                    doc.text('Time:', 480, signatureY);
                    doc.line(520, signatureY, 580, signatureY); // Line for time


                    // --- SAVE DOCUMENT ---
                    doc.save('proof_of_delivery.pdf');
                  }}
                >
                  Print PDF
                </button>

                <hr className="border-black" />

                <div className="mb-4 print-hide">
                  <h3 className="font-bold mb-2">Upload receipt after Delivery</h3>
                  {selectedOrderForPOD.deliveryproof_docpath && (
                    <div className="mb-2">
                      <img src={`${API_URL}/${selectedOrderForPOD.deliveryproof_docpath}?token=${localStorage.getItem('token')}`} alt="Delivery Proof" className="max-w-full max-h-48 border rounded" />
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <input type="file" accept="image/*" onChange={handlePodFileChange} className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-auto" />
                    <div className="flex flex-col gap-2">
                      <label className="text-sm">Delivery Date:</label>
                      <input type="date" value={podDate} onChange={e => setPodDate(e.target.value)} className="p-2 rounded border" />
                    </div>
                  </div>
                  {podThumbnail && (
                    <div className="mb-2">
                      <img src={podThumbnail} alt="Thumbnail" className="max-w-full max-h-48 border rounded" />
                    </div>
                  )}
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={handlePodUpload}
                    disabled={!podFile || podUploading || !!selectedOrderForPOD.deliveryproof_docpath}
                  >
                    {podUploading ? 'Uploading...' : 'Upload Proof'}
                  </button>
                </div>
              </>
            )}
            <div className="flex justify-center gap-4 mt-6 print-hide">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setShowProofOfDeliveryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Delivery Details */}
      {/* Modal para opciones de delivery */}
      {showDeliveryOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowDeliveryOptionsModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
              onClick={() => setShowDeliveryOptionsModal(false)}
              title="Close"
            >×</button>
            <h2 className="text-xl font-bold mb-4">Delivery Options</h2>
            <div className="flex flex-col gap-4">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowDeliveryOptionsModal(false);
                  navigate('/deliveries', { state: { order: selectedOrderForPOD } });
                }}
              >
                Crear envío para la orden seleccionada
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  setShowDeliveryOptionsModal(false);
                  fetchAvailableDeliveries();
                  setShowAssignToDeliveryModal(true);
                }}
              >
                Asignar a un envío creado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar a delivery existente */}
      {showAssignToDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowAssignToDeliveryModal(false)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
              onClick={() => setShowAssignToDeliveryModal(false)}
              title="Close"
            >×</button>
            <h2 className="text-xl font-bold mb-4">Assign to Existing Delivery</h2>
            <select
              value={selectedDeliveryId || ''}
              onChange={e => {
                const id = Number(e.target.value);
                setSelectedDeliveryId(id);
                if (id) {
                  fetchAssignedOrdersForDelivery(id);
                } else {
                  setAssignedOrdersToDelivery([]);
                }
              }}
              className="w-full p-2 border rounded mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Delivery</option>
              {availableDeliveries.map((delivery: any) => (
                <option key={delivery.id} value={delivery.id}>
                  {delivery.delivery_code} - {delivery.delivery_date}
                </option>
              ))}
            </select>
            {assignedOrdersToDelivery.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">Órdenes ya asignadas a esta delivery:</h3>
                <ul className="list-disc list-inside">
                  {assignedOrdersToDelivery.map((order: any) => (
                    <li key={order.id}>{order.order_code} - {order.fname} {order.lname}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-600 dark:text-gray-400">La orden seleccionada se agregará a estas.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setShowAssignToDeliveryModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleAssignToDelivery}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: 5.5in 8.5in;
            margin: 0.25in;
          }
          body * {
            visibility: hidden;
          }
          .print-modal, .print-modal * {
            visibility: visible;
          }
          .print-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 4.25in;
            margin: 0;
            padding: 0;
          }
          .print-content {
            box-shadow: none;
            border: none;
            padding: 20px;
            max-width: none;
            width: 100%;
            background: white;
            font-size: 14px;
            line-height: 1.4;
          }
          .print-hide {
            display: none !important;
          }
          .print-content .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
          }
          .print-content p {
            padding: 4px;
            margin: 0;
            background: white;
            border: none;
            font-size: 13px;
          }
          .print-content label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 13px;
          }
          .print-content h2 {
            font-size: 18px;
            margin-bottom: 15px;
          }
          .print-content input {
            font-size: 12px;
            padding: 4px;
            border: 1px solid #000;
            width: 100%;
          }
          .print-content .space-y-4 {
            gap: 10px;
          }
          .print-content .space-y-4 > div {
            margin-bottom: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default OrdersPage;