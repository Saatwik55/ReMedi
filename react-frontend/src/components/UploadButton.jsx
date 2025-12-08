import React, { useState } from 'react';

const server_url = import.meta.env.VITE_SERVER_URL;

const UploadButton = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${server_url}/upload/prescription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        setUploadStatus('success');
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        const error = await response.json();
        console.error('Upload failed:', error.message);
        setUploadStatus('error');
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="mt-2">
      <label className={`cursor-pointer inline-flex items-center gap-2 text-blue-600 hover:underline ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        <span>📎</span>
        <span>
          {uploading ? 'Uploading...' : 'Upload Prescription'}
        </span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="mt-2 inline-block ml-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
          ✓ Upload successful!
        </div>
      )}
      {uploadStatus === 'error' && (
        <div className="mt-2 inline-block ml-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
          ✗ Upload failed. Please try again.
        </div>
      )}
    </div>
  );
};

export default UploadButton;  