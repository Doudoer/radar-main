import React, { useRef, useState } from 'react';
import { FaTrash, FaCloudUploadAlt, FaFileAlt } from 'react-icons/fa';
import imageCompression from 'browser-image-compression';

interface AttachmentUploadProps {
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    existingAttachments?: any[];
    maxFiles?: number;
}

const AttachmentUpload: React.FC<AttachmentUploadProps> = ({ files, setFiles, maxFiles = 10 }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFiles = async (newFiles: FileList | null) => {
        if (!newFiles) return;
        const filesArray = Array.from(newFiles);

        // Process images (compression)
        const processedFiles: File[] = [];
        for (const file of filesArray) {
            if (file.type.startsWith('image/')) {
                try {
                    const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        initialQuality: 0.8
                    };
                    const compressedFile = await imageCompression(file, options);
                    const newFile = new File([compressedFile], file.name, { type: file.type });
                    processedFiles.push(newFile);
                } catch (error) {
                    console.error('Error compressing image:', error);
                    processedFiles.push(file); // Fallback to original
                }
            } else {
                processedFiles.push(file);
            }
        }

        if (files.length + processedFiles.length > maxFiles) {
            alert(`You can only upload a maximum of ${maxFiles} files.`);
            return;
        }

        setFiles(prev => [...prev, ...processedFiles]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                />
                <FaCloudUploadAlt className="text-4xl text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">Images, PDF, Doc (Max 10 files)</p>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative group bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <FaTrash size={10} />
                            </button>
                            <div className="h-20 w-full flex items-center justify-center mb-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                                {file.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                                ) : (
                                    <FaFileAlt className="text-3xl text-gray-500" />
                                )}
                            </div>
                            <p className="text-xs text-center w-full truncate px-1" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AttachmentUpload;
