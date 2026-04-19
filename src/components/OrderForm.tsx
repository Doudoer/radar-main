import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import AttachmentUpload from './AttachmentUpload';
import axios from 'axios';
import { API_URL } from '../config/api';
import CryptoJS from 'crypto-js';

interface Customer {
  // ... (rest of interfaces remain same mostly)
  id: string;
  fname: string;
  lname: string;
  wapp: string;
  imsg: string;
  shippadd: string;
  zip: string;
}

interface PayMethod {
  type: string;
  ccname: string;
  ccnumber: string;
  ccexpdate: string;
  cccvc: string;
  cczip: string;
  refpay: string;
  status: number;
}

interface Status {
  status: string;
  description: string;
  user_init: string;
}

interface Form {
  brand: string;
  model: string;
  year: string;
  drive_type: string;
  prod_type: string;
  disp_liter: string;
  cylinders: string;
  price: string;
  warranty: string;
  vin_nr: string;
  stock_nr: string;
  core: number;
  core_amount: string;
  shipping: number;
  shipp_add: string;
  down_pay: number;
  // pay_doc eliminado
  id_stat_order: string;
  orderDescription: string;
  transmissionType: string;
  ordermiles: string;
}

interface OrderFormProps {
  isEdit?: boolean;
  orderId?: string;
  userType?: string;
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  customer: Customer;
  setCustomer: React.Dispatch<React.SetStateAction<Customer>>;
  payMethod: PayMethod;
  setPayMethod: React.Dispatch<React.SetStateAction<PayMethod>>;
  status: Status;
  setStatus: React.Dispatch<React.SetStateAction<Status>>;
  customerId: string;
  setCustomerId: React.Dispatch<React.SetStateAction<string>>;
  customerSearch: string;
  setCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  filteredCustomers: Customer[];
  setFilteredCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  showCustomerForm: boolean;
  setShowCustomerForm: React.Dispatch<React.SetStateAction<boolean>>;
  autoSearchLoading: boolean;
  autoSearchError: string;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  // Handler para textarea
  handleDescriptionChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCustomerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePayMethodChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleStatusChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleCoreToggle: () => void;
  handleShippingToggle: () => void;
  handleCustomerSelect: (c: Customer) => void;
  handleSubmit: (e: React.FormEvent, securePayMethod?: PayMethod) => void;
  handleVinLookup: () => void;
  handleCardNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExpMonthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExpYearChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCvcChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cardCompany: string;
  cardLogos: Record<string, React.ReactNode>;
  // Eliminadas showPayDocModal y setShowPayDocModal
  PAYMENT_TYPES: { value: string; label: string }[];
  STATUS_OPTIONS: { id: number; status: string }[];
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

const OrderForm: React.FC<OrderFormProps> = ({
  isEdit = false,
  orderId: _orderId,
  userType: _userType,
  form,
  setForm: _setForm,
  customer,
  setCustomer: _setCustomer,
  payMethod,
  setPayMethod: _setPayMethod,
  status: _status,
  setStatus: _setStatus,
  customerId: _customerId,
  setCustomerId: _setCustomerId,
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  setFilteredCustomers: _setFilteredCustomers,
  showCustomerForm,
  setShowCustomerForm,
  autoSearchLoading,
  autoSearchError,
  handleFormChange,
  handleDescriptionChange: _handleDescriptionChange,
  handleCustomerChange,
  handlePayMethodChange,
  handleStatusChange: _handleStatusChange,
  handleCoreToggle,
  handleShippingToggle,
  handleCustomerSelect,
  handleSubmit,
  handleVinLookup,
  handleCardNumberChange,
  handleExpMonthChange,
  handleExpYearChange,
  handleCvcChange,
  cardCompany,
  cardLogos,
  PAYMENT_TYPES,
  STATUS_OPTIONS: _STATUS_OPTIONS,
  files,
  setFiles
}) => {
  const [customerSelectedFromSearch, setCustomerSelectedFromSearch] = useState(false);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const ENCRYPTION_KEY = 'defaultkey'; // Debe coincidir con el backend

  useEffect(() => {
    axios.get(`${API_URL}/api/vehicle/makes`)
      .then(res => {
        const makeNames = res.data.Results.map((r: any) => r.Make_Name);
        setMakes(makeNames);
      })
      .catch(err => console.error('Error fetching makes:', err));
  }, []);
  // ... (omitting lines for brevity) ...



  useEffect(() => {
    if (form.brand && form.year) {
      axios.get(`${API_URL}/api/vehicle/models?make=${encodeURIComponent(form.brand)}&year=${form.year}`)
        .then(res => {
          const modelNames = res.data.Results ? res.data.Results.map((r: any) => r.Model_Name) : [];
          setModels(modelNames);
        })
        .catch(err => console.error('Error fetching models:', err));
    } else {
      setModels([]);
    }
  }, [form.brand, form.year]);
  // --- Secure helpers ---
  // Encrypt function using AES
  function encryptField(data: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
  }

  // --- Secure submit handler ---
  const secureHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let securePayMethod = { ...payMethod };
    if (payMethod.type === 'Verify Credit Card Pay 💳' && !(isEdit && payMethod.status === 1)) {
      // Encrypt sensitive fields before sending, but not if editing and already paid
      securePayMethod = {
        ...payMethod,
        ccnumber: encryptField(payMethod.ccnumber),
        ccexpdate: encryptField(payMethod.ccexpdate),
        cccvc: encryptField(payMethod.cccvc),
        cczip: encryptField(payMethod.cczip)
      };
    }
    // Update payMethod state before calling handleSubmit
    // Llama a handleSubmit pasando el payMethod encriptado como segundo argumento
    if (typeof handleSubmit === 'function') {
      handleSubmit(e, securePayMethod);
    }
  };

  // --- Render ---
  // Handler para textarea de descripción
  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (typeof handleFormChange === 'function') {
      // Simular el mismo evento que para input/select
      handleFormChange({
        ...e,
        target: { ...e.target, name: 'orderDescription', value: e.target.value }
      } as any);
    }
  };

  // Wrapper para handleCustomerChange que resetea customerSelected si cambia wapp, imsg, fname o lname
  const handleCustomerChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof handleCustomerChange === 'function') {
      handleCustomerChange(e);
    }
    if (e.target.name === 'wapp' || e.target.name === 'imsg' || e.target.name === 'fname' || e.target.name === 'lname') {
      // Reset para permitir búsqueda nuevamente si cambia
    }
  };

  const handleCustomerSelectWrapper = (c: Customer) => {
    if (typeof handleCustomerSelect === 'function') {
      handleCustomerSelect(c);
    }
    setCustomerSelectedFromSearch(true);
  };

  // Wrapper para el precio que calcula la garantía automáticamente
  const handlePriceChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value;
    let newWarranty = form.warranty;

    const priceValue = parseFloat(newPrice);
    if (!isNaN(priceValue)) {
      if (priceValue <= 999) {
        newWarranty = '30 days';
      } else if (priceValue >= 1000 && priceValue <= 1499) {
        newWarranty = '60 days';
      } else if (priceValue >= 1500) {
        newWarranty = '90 days';
      }
    } else {
      // Si borra el precio o es inválido, podríamo resetear o mantener.
      // De momento mantenemos la lógica actual o no hacemos nada extra.
    }

    _setForm(prev => ({
      ...prev,
      price: newPrice,
      warranty: newWarranty
    }));
  };
  return (
    <div>
      <form className="bg-gray-100 dark:bg-gray-900 p-4 rounded mb-6 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={secureHandleSubmit} style={{ minWidth: '320px' }}>
        {/* Buscar cliente */}
        {!showCustomerForm ? (
          <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
            <input
              type="text"
              value={customerSearch}
              onChange={e => {
                if (typeof setCustomerSearch === 'function') {
                  setCustomerSearch(e.target.value);
                }
                setCustomerSelectedFromSearch(false);
              }}
              placeholder="Search customer by name or surname"
              className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoComplete="off"
            />
            {filteredCustomers.length > 0 && !customerSelectedFromSearch && (
              <div className="bg-white dark:bg-gray-800 border rounded shadow max-h-40 overflow-y-auto z-10">
                {filteredCustomers.map((c: Customer) => (
                  <div
                    key={c.id}
                    className="p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={() => handleCustomerSelectWrapper(c)}
                  >
                    {c.fname} {c.lname} {c.wapp && `- ${c.wapp}`}
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="bg-blue-500 text-white px-2 py-1 rounded w-fit mt-2" onClick={() => setShowCustomerForm(true)}>
              Add new customer
            </button>
          </div>
        ) : (
          <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded mb-4">
            <h3 className="font-bold mb-2">New Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="fname" value={customer.fname} onChange={handleCustomerChange} placeholder="First Name" className="p-2 rounded border w-full min-h-[44px]" required />
              <input name="lname" value={customer.lname} onChange={handleCustomerChange} placeholder="Last Name" className="p-2 rounded border w-full min-h-[44px]" required />
              <input name="wapp" value={customer.wapp} onChange={handleCustomerChangeWrapper} placeholder="WhatsApp" className="p-2 rounded border w-full min-h-[44px]" />
              <input name="imsg" value={customer.imsg} onChange={handleCustomerChangeWrapper} placeholder="iMessage" className="p-2 rounded border w-full min-h-[44px]" />
              <input name="shippadd" value={customer.shippadd} onChange={handleCustomerChange} placeholder="Shipping Address" className="p-2 rounded border w-full min-h-[44px]" />
              <input name="zip" value={customer.zip} onChange={handleCustomerChange} placeholder="ZIP" className="p-2 rounded border w-full min-h-[44px]" />
              {autoSearchLoading && (
                <div className="col-span-1 text-blue-500 text-sm">Searching for matches...</div>
              )}
              {autoSearchError && (
                <div className="col-span-1 text-red-500 text-sm">{autoSearchError}</div>
              )}
              {/* Mostrar coincidencias si existen */}
              {filteredCustomers.length > 0 && (
                <div className="col-span-1 bg-white dark:bg-gray-800 border rounded shadow max-h-40 overflow-y-auto z-10 mt-2">
                  <div className="font-semibold p-2">Cliente encontrado. Selecciona para usar existente:</div>
                  {filteredCustomers.map((c: Customer) => (
                    <div
                      key={c.id}
                      className="p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => {
                        // Transferir a la búsqueda existente
                        setCustomerSearch(`${c.fname} ${c.lname}`);
                        setShowCustomerForm(false);
                        handleCustomerSelect(c);
                        setCustomerSelectedFromSearch(true);
                      }}
                    >
                      {c.fname} {c.lname} {c.wapp && `- ${c.wapp}`}
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="bg-gray-500 text-white px-4 py-2 rounded col-span-1 min-h-[44px]" onClick={() => setShowCustomerForm(false)}>Use existing customer</button>
            </div>
          </div>
        )}
        {/* VIN y datos del vehículo */}
        <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-2">
          <input
            name="vin_nr"
            value={form.vin_nr}
            onChange={handleFormChange}
            placeholder="VIN Number or 8th Digit"
            className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1"
          />
          <button
            type="button"
            className="bg-blue-500 text-white px-2 py-1 rounded flex-none"
            onClick={handleVinLookup}
            title="VIN Search"
          >
            VIN Search
          </button>
        </div>
        <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              list="brand-options"
              name="brand"
              value={form.brand}
              onChange={handleFormChange}
              className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Select or type Brand"
              required
            />
            <datalist id="brand-options">
              {makes.map(make => (
                <option key={make} value={make} />
              ))}
            </datalist>
          </div>
          <div className="flex-none w-25">
            <input
              list="year-options"
              name="year"
              value={form.year}
              onChange={handleFormChange}
              className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Year"
              type='number'
              required
              inputMode="numeric"
            />
            <datalist id="year-options">
              {(() => {
                const currentYear = new Date().getFullYear();
                return Array.from({ length: currentYear - 1981 + 1 }, (_, i) => 1981 + i).map(year => (
                  <option key={year} value={year.toString()} />
                ));
              })()}
            </datalist>
          </div>
          <div className="flex-1">
            <input
              list="model-options"
              name="model"
              value={form.model}
              onChange={handleFormChange}
              className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Select or type Model"
              required
            />
            <datalist id="model-options">
              {models.map((model, index) => (
                <option key={`${model}-${index}`} value={model} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="flex items-center">
          <select name="prod_type" value={form.prod_type} onChange={handleFormChange} className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" required>
            <option value="">Select Product Type</option>
            <option value="Engine">Engine</option>
            <option value="Transmission">Transmission</option>
            <option value="Differential">Differential</option>
          </select>
        </div>
        {(form.prod_type === 'Engine' || form.prod_type === 'Transmission' || form.prod_type === 'Differential') && (
          <>
            <input
              list="drive-options"
              name="drive_type"
              value={form.drive_type}
              onChange={handleFormChange}
              className="p-2 rounded border w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
              placeholder="Drive Type FWD/RWD/4WD/AWD"
            />
            <datalist id="drive-options">
              <option value="FWD" />
              <option value="RWD" />
              <option value="4WD" />
              <option value="AWD" />
            </datalist>
          </>
        )}
        {(form.prod_type === 'Engine' || form.prod_type === 'Transmission' || form.prod_type === 'Differential') && <FloatingInput name="ordermiles" value={form.ordermiles} onChange={handleFormChange} label="Miles" type='number' />}
        {/* Tipo de transmisión */}
        {(form.prod_type === 'Transmission' || form.prod_type === 'Differential') && <div className="flex items-center">
          <select name="transmissionType" value={form.transmissionType} onChange={handleFormChange} className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Select Transmission Type</option>
            <option value="MT">MT Manual Transmission</option>
            <option value="AT">AT Automatic Transmission</option>
            <option value="CVT">CVT Continuously Variable Transmission</option>
            <option value="DCT">DCT Dual Clutch Transmission</option>
            <option value="AMT">AMT Automated Manual Transmission</option>
          </select>
        </div>}
        {form.prod_type === 'Engine' && <FloatingInput name="disp_liter" value={form.disp_liter} onChange={handleFormChange} label="Liters" type='number' />}
        {form.prod_type === 'Engine' && <FloatingInput name="cylinders" value={form.cylinders} onChange={handleFormChange} label="Cylinders" type='number' />}
        <FloatingInput name="price" value={form.price} onChange={handlePriceChangeWrapper} label="Precio" type="number" required />
        <div className="flex items-center">
          <select name="warranty" value={form.warranty} onChange={handleFormChange} className="min-h-[44px] w-full px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" required>
            <option value="">Warranty Type</option>
            <option value="30 days">30 days</option>
            <option value="60 days">60 days</option>
            <option value="90 days">90 days</option>
            <option value="No Warranty">No Warranty</option>
          </select>
        </div>
        <FloatingInput name="stock_nr" value={form.stock_nr} onChange={handleFormChange} label="Stock #" />
        {/* Core slider */}
        <div className="flex items-center gap-2">
          <label className="font-semibold">Core:</label>
          <label className="switch">
            <input type="checkbox" checked={!!form.core} onChange={handleCoreToggle} />
            <span className="slider"></span>
          </label>
          <span>{form.core ? 'Yes' : 'No'}</span>
          {!form.core && (
            <>
              <input
                name="core_amount"
                value={form.core_amount}
                onChange={handleFormChange}
                placeholder="Core Amount"
                type="number"
                className="p-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-24"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Additional charge will be applied</span>
            </>
          )}
        </div>
        {/* Shipping slider */}
        <div className="flex items-center gap-2">
          <label className="font-semibold">Shipping:</label>
          <label className="switch">
            <input type="checkbox" checked={!!form.shipping} onChange={handleShippingToggle} />
            <span className="slider"></span>
          </label>
          <span>{form.shipping ? 'Yes' : 'No'}</span>
        </div>
        {form.shipping ? (
          <FloatingInput
            name="shipp_add"
            value={form.shipp_add}
            onChange={handleFormChange}
            label="Shipping Address"
          />
        ) : (
          <FloatingInput name="down_pay" value={String(form.down_pay)} onChange={handleFormChange} label="Down Payment" type="number" min={0} />
        )}
        {form.shipping && <FloatingInput name="down_pay" value={String(form.down_pay)} onChange={handleFormChange} label="Down Payment" type="number" min={0} />}
        {/* Descripción extendida */}
        <div className="col-span-1 md:col-span-2">
          <label className="block font-semibold mb-1">Order Description</label>
          <textarea
            name="orderDescription"
            value={form.orderDescription}
            onChange={handleDescChange}
            className="p-2 rounded border w-full min-h-[80px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y"
            placeholder="Add a detailed description for the order..."
          />
        </div>
        {/* Método de pago */}
        <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4">
          <h3 className="font-bold mb-2">Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center">
              <select name="type" value={payMethod.type} onChange={handlePayMethodChange} className="min-h-[44px] px-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" required disabled={isEdit && payMethod.status === 1}>
                <option value="">Payment Type</option>
                {PAYMENT_TYPES.map((pt: { value: string; label: string }) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            {/* Campos de tarjeta solo si Verify Credit Card Pay 💳 */}
            {payMethod.type === 'Verify Credit Card Pay 💳' && (
              <>
                <FloatingInput name="ccname" value={payMethod.ccname} onChange={handlePayMethodChange} label="Name on Card *" className="w-full min-h-[44px] rounded border" required readOnly={isEdit && payMethod.status === 1} />
                <div className="flex flex-col gap-1">
                  <div className="relative flex items-center">
                    <input
                      name="ccnumber"
                      value={typeof payMethod.ccnumber === 'string' ? payMethod.ccnumber.replace(/(.{4})/g, '$1 ').trim() : ''}
                      onChange={e => {
                        // Remove spaces before saving
                        const raw = e.target.value.replace(/\s+/g, '');
                        handleCardNumberChange({
                          ...e,
                          target: { ...e.target, value: raw }
                        });
                      }}
                      placeholder="Card Number *"
                      className="p-2 rounded border w-full pr-12 text-lg tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      maxLength={19}
                      autoComplete="cc-number"
                      style={{ minHeight: '44px' }}
                      required
                      readOnly={isEdit && payMethod.status === 1}
                    />
                    {cardCompany && (
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
                        {cardLogos[cardCompany]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FloatingInput
                    name="expmonth"
                    value={typeof payMethod.ccexpdate === 'string' ? payMethod.ccexpdate.slice(0, 2) : ''}
                    onChange={handleExpMonthChange}
                    label="MM *"
                    className="p-2 rounded border w-16 min-w-[56px] min-h-[44px]"
                    maxLength={2}
                    required
                    readOnly={isEdit && payMethod.status === 1}
                  />
                  <span>/</span>
                  <FloatingInput
                    name="expyear"
                    value={typeof payMethod.ccexpdate === 'string' ? payMethod.ccexpdate.slice(2, 4) : ''}
                    onChange={handleExpYearChange}
                    label="YY *"
                    className="p-2 rounded border w-16 min-w-[56px] min-h-[44px]"
                    maxLength={2}
                    required
                    readOnly={isEdit && payMethod.status === 1}
                  />
                </div>
                <FloatingInput
                  name="cccvc"
                  value={payMethod.cccvc}
                  onChange={handleCvcChange}
                  label="CVC *"
                  className="p-2 rounded border w-20 min-w-[64px] min-h-[44px]"
                  maxLength={4}
                  required
                  readOnly={isEdit && payMethod.status === 1}
                />
                <FloatingInput name="cczip" value={payMethod.cczip} onChange={handlePayMethodChange} label="ZIP *" className="p-2 rounded border w-full min-h-[44px]" required readOnly={isEdit && payMethod.status === 1} />
                {/* Responsive spacing for payment fields */}
              </>
            )}
            {/* Referencia solo si Zelle o CashApp */}
            {(payMethod.type === 'Zelle' || payMethod.type === 'CashApp') && (
              <input name="refpay" value={payMethod.refpay} onChange={handlePayMethodChange} placeholder="Reference Payment" className="p-2 rounded border w-full min-h-[44px]" readOnly={isEdit && payMethod.status === 1} />
            )}
          </div>
        </div>

        {/* Attachments Section */}
        <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold mb-2 text-gray-700 dark:text-gray-300">Attachments (Optional)</h3>
          <p className="text-sm text-gray-500 mb-2">Upload photos or documents for reference (e.g. transmission type, part condition).</p>
          <AttachmentUpload files={files} setFiles={setFiles} maxFiles={10} />
        </div>

        <button type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded col-span-1 md:col-span-2 w-full text-lg font-semibold mt-2">
          {isEdit ? 'Update Order' : 'Create Order'}
        </button>
        {/*
        Para mostrar datos enmascarados en los modales:
        maskCardNumber(payMethod.ccnumber)
        maskCVC(payMethod.cccvc)
        maskZIP(payMethod.cczip)
      */}
      </form>
    </div>
  );
};

export default OrderForm;
