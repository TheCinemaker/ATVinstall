import { useState } from 'react';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { loginWithEmail } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Auto-append @atvinstall.com to username
            const email = `${username.toLowerCase().trim()}@atvinstall.com`;
            await loginWithEmail(email, password);
            navigate('/projects');
        } catch (err) {
            console.error('Login error:', err);
            setError('Invalid username or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="ATVinstall"
                            className="h-32 w-auto max-w-[80%] object-contain"
                        />
                    </div>
                    <p className="text-gray-400">AT-Visions Installation Management system</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6 bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-200 mb-2">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                autoComplete="username"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900/50 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all outline-none placeholder-gray-500"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <p className="mt-1 text-xs text-gray-500">@atvinstall.com will be added automatically</p>
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-200 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900/50 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all outline-none placeholder-gray-500"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border-2 border-red-800 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-3 text-base font-semibold bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-lg hover:shadow-xl transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Logging in...
                            </>
                        ) : (
                            'Login'
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-gray-500">
                    Secure access for authorized installers only
                </p>
                <Footer />
            </div>
        </div>
    );
}
