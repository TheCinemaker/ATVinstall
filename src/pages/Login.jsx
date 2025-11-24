import { useState } from 'react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { loginDemo } = useAuth();

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        // Specific credentials requested by user
        if (username.trim() === 'ATVinstall' && password.trim() === '12345678') {
            loginDemo(username);
            navigate('/projects');
        } else {
            console.log('Login failed:', { username, password });
            setError(`Invalid credentials. Received: '${username}' / '${password}'. Expected: ATVinstall / 12345678`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Networking App</h1>
                    <p className="mt-2 text-muted-foreground font-medium text-green-600">OFFLINE MODE</p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-6 bg-card p-8 rounded-xl border shadow-sm">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-foreground">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full">
                        Login
                    </Button>
                </form>
            </div>
        </div>
    );
}
