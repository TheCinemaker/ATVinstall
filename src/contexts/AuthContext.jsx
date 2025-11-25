import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInAnonymously, updateProfile, onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Always true for this app
    const isDemo = true;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginDemo = async (username = "Installer") => {
        try {
            // We use anonymous auth for simplicity, but update the profile with the name
            const result = await signInAnonymously(auth);
            await updateProfile(result.user, {
                displayName: username
            });
            // Force update local state to reflect display name immediately
            setUser({ ...result.user, displayName: username });
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const result = await signInWithEmailAndPassword(auth, email, password);
            setUser(result.user);
        } catch (error) {
            console.error("Email login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const value = {
        user,
        isDemo,
        loginDemo,
        loginWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
