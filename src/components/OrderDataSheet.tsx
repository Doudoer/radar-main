import React from 'react';
import AttachmentCarousel from './AttachmentCarousel';

interface OrderDataSheetProps {
    order: any;
    attachments?: any[];
}

const OrderDataSheet: React.FC<OrderDataSheetProps> = ({ order, attachments }) => {

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
        <div className="order-data-sheet-content">
            <h1 className="text-xl font-bold mb-4 text-center">Order Data Sheet</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Order Code:</span>
                        <span className="text-gray-900 dark:text-white">{order.order_code.slice(-6)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Customer:</span>
                        <span className="text-gray-900 dark:text-white">{order.fname} {order.lname}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Phone:</span>
                        <span className="text-gray-900 dark:text-white">{order.wapp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">VIN:</span>
                        <span className="text-gray-900 dark:text-white">{order.vin_nr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Make:</span>
                        <span className="text-gray-900 dark:text-white">{order.brand}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Model:</span>
                        <span className="text-gray-900 dark:text-white">{order.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Year:</span>
                        <span className="text-gray-900 dark:text-white">{order.year}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Product Type:</span>
                        <span className="text-gray-900 dark:text-white">{order.prod_type}</span>
                    </div>
                    {(order.prod_type === 'Engine' || order.prod_type === 'Transmission' || order.prod_type === 'Differential') && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Drive Type:</span>
                            <span className="text-gray-900 dark:text-white">{order.drive_type}</span>
                        </div>
                    )}
                    {(order.prod_type === 'Transmission' || order.prod_type === 'Differential') && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Transmission:</span>
                            <span className="text-gray-900 dark:text-white">{order.transmissionType || '-'}</span>
                        </div>
                    )}
                    {(order.prod_type === 'Engine' || order.prod_type === 'Transmission' || order.prod_type === 'Differential') && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Miles:</span>
                            <span className="text-gray-900 dark:text-white">{order.ordermiles}</span>
                        </div>
                    )}
                    {order.prod_type === 'Engine' && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Displacement (L):</span>
                            <span className="text-gray-900 dark:text-white">{order.disp_liter}</span>
                        </div>
                    )}
                    {order.prod_type === 'Engine' && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Cylinders:</span>
                            <span className="text-gray-900 dark:text-white">{order.cylinders}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Price:</span>
                        <span className="text-gray-900 dark:text-white">{order.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Down Payment:</span>
                        <span className="text-gray-900 dark:text-white">{order.down_pay}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Warranty:</span>
                        <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">{order.warranty}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Warranty Status:</span>
                        <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">{renderWarranty(order)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Stock #:</span>
                        <span className="text-gray-900 dark:text-white">{order.stock_nr}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Core:</span>
                        <span className="text-gray-900 dark:text-white">{order.core ? 'Yes' : 'No'}</span>
                    </div>
                    {!order.core && (
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">Core Amount:</span>
                            <span className="text-gray-900 dark:text-white">{order.core_amount}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Shipping:</span>
                        <span className="text-gray-900 dark:text-white">{order.shipping ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Shipping Address:</span>
                        <span className="text-gray-900 dark:text-white">{order.shipping ? order.shipp_add : ''}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Creation Date:</span>
                        <span className="text-gray-900 dark:text-white">{order.created_at?.slice(0, 10)}</span>
                    </div>
                </div>
                <div className="flex flex-col gap-4 w-full">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col gap-2 w-full">
                        <span className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Order Description:</span>
                        <div className="bg-white dark:bg-gray-900 rounded p-3 text-gray-800 dark:text-gray-100 whitespace-pre-line border border-gray-200 dark:border-gray-700 min-h-[80px]">
                            {order && typeof order.orderDescription === 'string' && order.orderDescription.trim() !== ''
                                ? order.orderDescription
                                : <span className="italic text-gray-400">No description provided.</span>}
                        </div>
                    </div>
                    {/* Attachments Carousel */}
                    {attachments && attachments.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow">
                            <AttachmentCarousel
                                attachments={attachments}
                                title="Order Attachments"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDataSheet;
