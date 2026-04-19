import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes, FaDownload, FaFileAlt, FaTrash } from 'react-icons/fa';

interface Attachment {
    id: number;
    order_id: number;
    file_path: string;
    original_name: string;
    file_type: string;
    url?: string; // public url
}

interface AttachmentCarouselProps {
    attachments: Attachment[];
    title?: string;
    onDelete?: (id: number) => void;
}

const AttachmentCarousel: React.FC<AttachmentCarouselProps> = ({ attachments, title = "Attachments", onDelete }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!attachments || attachments.length === 0) return null;

    const openModal = (index: number) => {
        setCurrentIndex(index);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
    };

    const nextSlide = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % attachments.length);
    };

    const prevSlide = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    };

    const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                {title} <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full">{attachments.length}</span>
            </h3>

            {/* Thumbnails Row */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {attachments.map((file, index) => (
                    <div
                        key={file.id}
                        className="flex-none w-24 h-24 relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 dark:bg-gray-800"
                        onClick={() => openModal(index)}
                    >
                        {file.file_type.startsWith('image/') ? (
                            <img src={file.url} alt={file.original_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-1">
                                <FaFileAlt size={24} className="mb-1" />
                                <span className="text-[10px] text-center w-full truncate">{file.original_name}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={closeModal}>
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2"
                        onClick={closeModal}
                    >
                        <FaTimes size={24} />
                    </button>

                    {/* Navigation */}
                    {attachments.length > 1 && (
                        <>
                            <button className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 backdrop-blur-sm transition-all transform hover:scale-110" onClick={prevSlide}>
                                <FaChevronLeft size={24} />
                            </button>
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-white bg-black/30 hover:bg-black/60 rounded-full p-2 backdrop-blur-sm transition-all transform hover:scale-110" onClick={nextSlide}>
                                <FaChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* Content */}
                    <div className="max-w-4xl max-h-[85vh] relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        {attachments[currentIndex].file_type.startsWith('image/') ? (
                            <img
                                src={attachments[currentIndex].url}
                                alt={attachments[currentIndex].original_name}
                                className="max-w-full max-h-[80vh] object-contain rounded shadow-xl"
                            />
                        ) : (
                            <div className="bg-white p-10 rounded-lg flex flex-col items-center">
                                <FaFileAlt size={64} className="text-gray-500 mb-4" />
                                <p className="text-xl font-medium mb-4">{attachments[currentIndex].original_name}</p>
                                <button
                                    onClick={(e) => attachments[currentIndex].url && handleDownload(e, attachments[currentIndex].url!, attachments[currentIndex].original_name)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <FaDownload /> Download File
                                </button>
                            </div>
                        )}

                        {/* Image Footer Info */}
                        {attachments[currentIndex].file_type.startsWith('image/') && (
                            <div className="mt-4 flex gap-4">
                                <button
                                    onClick={(e) => attachments[currentIndex].url && handleDownload(e, attachments[currentIndex].url!, attachments[currentIndex].original_name)}
                                    className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm transition-colors"
                                >
                                    <FaDownload size={14} /> Download
                                </button>
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Delete this attachment?')) {
                                                onDelete(attachments[currentIndex].id);
                                                if (attachments.length === 1) closeModal();
                                                else nextSlide();
                                            }
                                        }}
                                        className="bg-red-500/80 hover:bg-red-600/90 text-white backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm transition-colors"
                                    >
                                        <FaTrash size={14} /> Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Thumbnails indicator */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 overflow-x-auto p-2">
                        {attachments.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttachmentCarousel;
