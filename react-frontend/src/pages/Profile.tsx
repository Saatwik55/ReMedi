const server_url = import.meta.env.VITE_SERVER_URL;
import { useEffect, useState } from 'react';

interface User {
  name: string;
  age: number;
  email: string;
  gender?: string;
  ailments?: string[];
  medications?: string;
}

interface Prescription {
  id: string;
  filename: string;
  upload_date: string;
  status: string;
  file_size: number;
  file_type: string;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // -------------------------
  // DELETE PRESCRIPTION
  // -------------------------
  const deletePrescription = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Not logged in");

    if (!confirm("Delete this prescription permanently?")) return;

    try {
      const res = await fetch(`${server_url}/upload/prescriptions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }

      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting prescription");
    }
  };

  // -------------------------
  // FETCH PROFILE + PRESCRIPTIONS
  // -------------------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`${server_url}/api/profile`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUser(false);
      }
    };

    const fetchPrescriptions = async () => {
      try {
        const res = await fetch(`${server_url}/upload/prescriptions`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch prescriptions');
        const data = await res.json();
        setPrescriptions(data.prescriptions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPrescriptions(false);
      }
    };

    fetchUser();
    fetchPrescriptions();
  }, []);

  // -------------------------
  // FETCH IMAGE WITH TOKEN
  // -------------------------
  const previewPrescription = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${server_url}/upload/prescriptions/${id}/file`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load image");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
      alert("Failed to preview image");
    }
  };

  if (loadingUser || loadingPrescriptions) return <div className="text-center mt-20">Loading...</div>;
  if (!user) return <div className="text-center mt-20">No user data found.</div>;

  return (
    <div className="flex justify-center items-start pt-16 bg-gray-100 min-h-screen px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 text-center">User Profile</h2>

        {/* User info */}
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Name:</span>
            <span className="text-gray-800">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Age:</span>
            <span className="text-gray-800">{user.age}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-600">Email:</span>
            <span className="text-gray-800">{user.email}</span>
          </div>
        </div>

        <div className="pt-4">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition-colors"
            onClick={() => alert('Forgot password flow goes here')}
          >
            Forgot Password
          </button>
        </div>

        {/* Prescriptions */}
        <div className="pt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Prescriptions</h3>
          {prescriptions.length === 0 ? (
            <div className="text-gray-500">No uploads yet.</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {prescriptions.map((p) => (
                <li key={p.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2 shadow-sm">
                  <div>
                    <div
                      className="font-medium text-blue-600 underline cursor-pointer"
                      onClick={() => previewPrescription(p.id)}
                    >
                      {p.filename}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(p.upload_date).toLocaleDateString()} • {p.status}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">{(p.file_size / 1024).toFixed(1)} KB</div>
                    <button
                      className="text-red-600 hover:text-red-800 font-semibold"
                      onClick={() => deletePrescription(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl max-w-lg max-h-[80vh] overflow-auto">
            <img src={previewUrl} alt="Prescription" className="max-h-[60vh] mx-auto" />
            <button
              className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg"
              onClick={() => {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
