import ChatBot from '../components/ChatBot';
import { FaUserAlt } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const server_url = import.meta.env.VITE_SERVER_URL;

const ProfileModal = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch(`${server_url}/api/profile`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch profile');

        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6 z-10">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-gray-800 text-center">User Profile</h2>

        {loading ? (
          <div className="text-center mt-4">Loading...</div>
        ) : !user ? (
          <div className="text-center mt-4">No user data found.</div>
        ) : (
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

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition-colors mt-4"
              onClick={() => navigate('/profile')}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      {/* Navbar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">R</div>
          <span className="font-semibold text-gray-800 text-lg">ReMedi</span>
        </div>

        <div
          className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer"
          onClick={() => setShowProfile(true)}
        >
          <FaUserAlt className="text-gray-600" />
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex justify-center overflow-hidden min-h-0">
        <div className="w-full max-w-3xl h-full flex flex-col">
          <ChatBot />
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default ChatPage;
