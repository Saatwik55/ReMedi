import { useState } from "react";
import { useNavigate } from 'react-router-dom';
const server_url = import.meta.env.VITE_SERVER_URL as string;
interface FormData {
  name: string;
  email: string;
  password: string;
  age: string;
  gender: string;
}

interface ApiResponse {
  msg: string;
  token?: string;
  user?: {
    name: string;
    email: string;
    age: number;
    gender: string;
  };
}

const ReMediAuth = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    age: "",
    gender: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const showMessage = (text: string, type: 'error' | 'success') => {
    setMessage({ text, type });
    // Auto-hide message after 5 seconds
    setTimeout(() => setMessage(null), 5000);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): string | null => {
    if (activeTab === "login") {
      if (!formData.email || !isValidEmail(formData.email)) {
        return "Please enter a valid email address";
      }
      if (!formData.password) {
        return "Password is required";
      }
    } else {
      if (!formData.name || formData.name.trim().length < 2) {
        return "Name must be at least 2 characters long";
      }
      if (!formData.email || !isValidEmail(formData.email)) {
        return "Please enter a valid email address";
      }
      if (!formData.password || formData.password.length < 6) {
        return "Password must be at least 6 characters long";
      }
      if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
        return "Please enter a valid age (1-120)";
      }
      if (!formData.gender) {
        return "Please select a gender";
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Client-side validation
  const validationError = validateForm();
  if (validationError) {
    showMessage(validationError, 'error');
    return;
  }

  setIsLoading(true);
  setMessage(null);

  try {
    const endpoint = activeTab === "login" ? "/api/login" : "/api/signup";
    const payload = activeTab === "login"
      ? { email: formData.email, password: formData.password }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          age: parseInt(formData.age),
          gender: formData.gender
        };

    const response = await fetch(`${server_url}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: ApiResponse = await response.json();

    if (response.ok) {
      console.log("Success:", data);

      // Store token and user data
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      const successMessage = activeTab === "login"
        ? "Login successful! Redirecting to dashboard..."
        : "Account created successfully! Redirecting to dashboard...";

      showMessage(successMessage, 'success');

      setTimeout(() => {
        navigate('/chatbot');
      }, 1500);

    } else {
      showMessage(data.msg || "Authentication failed. Please try again.", 'error');
    }
  } catch (error) {
    console.error("Network error:", error);
    showMessage("Network error. Please check your connection and try again.", 'error');
  } finally {
    setIsLoading(false);
  }
};

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMessage(null); // Clear any existing messages
    setFormData({ // Reset form data
      name: "",
      email: "",
      password: "",
      age: "",
      gender: ""
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            
            <h1 className="text-3xl font-bold text-white">
              ReMedi
            </h1>
          </div>
          <p className="text-gray-400">Easy & Personalized Health Care</p>
        </div>

        {/* Card with Tabs */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => handleTabChange("login")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "login"
                  ? "text-white bg-gray-700 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange("register")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === "register"
                  ? "text-white bg-gray-700 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Message Display */}
            {message && (
              <div className={`mb-4 p-3 rounded-md text-sm font-medium text-center ${
                message.type === 'error' 
                  ? 'bg-red-900/50 border border-red-500 text-red-300' 
                  : 'bg-green-900/50 border border-green-500 text-green-300'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === "login" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Your email address"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-2 px-4 rounded-md font-medium hover:from-blue-600 hover:to-green-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                </div>
              )}

              {activeTab === "register" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Your email address"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Your age"
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a password"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-2 px-4 rounded-md font-medium hover:from-blue-600 hover:to-green-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? "Signing up..." : "Sign Up"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          {activeTab === "login" ? (
            <p>
              Don't have an account?{" "}
              <button
                onClick={() => handleTabChange("register")}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => handleTabChange("login")}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReMediAuth;