import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // Always true for offline mode
    const isDemo = true;

    useEffect(() => {
        // Check if we have a user in localStorage
        const storedUser = localStorage.getItem('offline_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const loginDemo = (username = "Offline User") => {
        const newUser = { email: `${username.toLowerCase().replace(/\s/g, '')}@offline.com`, uid: 'offline-' + Date.now(), isDemo: true, displayName: username };
        localStorage.setItem('offline_user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('offline_user');
        setUser(null);
    };

    const value = {
        user,
        isDemo,
        loginDemo,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
