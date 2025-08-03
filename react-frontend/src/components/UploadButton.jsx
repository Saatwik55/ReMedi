import React from 'react';

const UploadButton = () => {
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Uploaded file:", file.name);
      // TODO: OCR processing goes here
    }
  };

  return (
    <div className="mt-2">
      <label className="cursor-pointer inline-block text-blue-600 hover:underline">
        📎 Upload Prescription
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleUpload}
        />
      </label>
    </div>
  );
};

export default UploadButton;
