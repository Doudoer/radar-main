import React from 'react';

interface VinModalProps {
  vinModalOpen: boolean;
  setVinModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  vinLoading: boolean;
  vinError: string;
  vinData: any;
  handlePasteVinData: () => void;
}

const VinModal: React.FC<VinModalProps> = ({
  vinModalOpen,
  setVinModalOpen,
  vinLoading,
  vinError,
  vinData,
  handlePasteVinData
}) => {
  if (!vinModalOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md relative" style={{maxHeight: '80vh', overflowY: 'auto'}}>
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
          onClick={() => setVinModalOpen(false)}
          title="Cerrar"
        >×</button>
        <h2 className="text-lg font-bold mb-2">VIN Data</h2>
        {vinLoading && <div className="text-blue-500">Consulting...</div>}
        {vinError && <div className="text-red-500 mb-2">{vinError}</div>}
        {vinData && !vinError && (
          <div className="mb-4 text-sm">
            <div><strong>Brand:</strong> {vinData.Make}</div>
            <div><strong>Model:</strong> {vinData.Model}</div>
            <div><strong>Year:</strong> {vinData.ModelYear}</div>
            <div><strong>Drive Type:</strong> {vinData.DriveType}</div>
            <div><strong>Liters:</strong> {vinData.DisplacementL}</div>
            <div><strong>Cylinders:</strong> {vinData.EngineCylinders}</div>
            <div><strong>Vehicle Type:</strong> {vinData.VehicleType}</div>
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={handlePasteVinData}
            disabled={!vinData}
          >Paste data into form</button>
          <button
            type="button"
            className="bg-gray-400 text-white px-4 py-2 rounded"
            onClick={() => setVinModalOpen(false)}
          >Close</button>
        </div>
      </div>
    </div>
  );
};

export default VinModal;
