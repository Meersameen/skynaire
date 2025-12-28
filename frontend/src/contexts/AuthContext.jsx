import React, {
    createContext,
    useState,
    useEffect,
    useContext
} from "react";
import { API_BASE_URL } from "../api/config";
import { auth } from "../firebase";
import {
    onAuthStateChanged,
    getRedirectResult
} from "firebase/auth";

/**
 * Create context with explicit undefined default
 * (helps catch incorrect usage early)
 */
const AuthContext = createContext(undefined);

/**
 * Safe hook – will throw a clear error
 * instead of crashing with undefined destructuring
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

/**
 * Auth Provider
 */
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("🔑 Initializing Auth Listener...");

        let isMounted = true;
        let redirectCheckDone = false;

        // 1️⃣ Listen for Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMounted) return;

            console.log(
                "🔄 Auth State Changed:",
                user ? `Logged in as ${user.email}` : "Logged out"
            );

            if (user) {
                setCurrentUser(user);
                setLoading(false);

                // Sync user with backend
                try {
                    console.log("🔗 Syncing user with backend...");

                    const res = await fetch(
                        `${API_BASE_URL}/api/users/sync`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                firebaseUid: user.uid,
                                email: user.email,
                                displayName:
                                    user.displayName || "New User",
                                photoURL: user.photoURL
                            })
                        }
                    );

                    if (res.ok) {
                        console.log("✅ User synced with backend");
                    } else {
                        const errorData = await res
                            .json()
                            .catch(() => ({}));
                        console.error(
                            "❌ Backend sync failed:",
                            res.status,
                            errorData
                        );
                    }
                } catch (err) {
                    console.error(
                        "❌ Failed to sync user:",
                        err
                    );
                }
            } else {
                setCurrentUser(null);

                // Stop loading only after redirect check
                if (redirectCheckDone) {
                    setLoading(false);
                }
            }
        });

        // 2️⃣ Handle OAuth redirect results
        const checkRedirect = async () => {
            try {
                console.log("🔍 Checking redirect result...");
                const result = await getRedirectResult(auth);

                if (result && isMounted) {
                    console.log(
                        "✅ Redirect login successful:",
                        result.user.email
                    );
                    setCurrentUser(result.user);
                }
            } catch (err) {
                console.error(
                    "❌ Redirect authentication error:",
                    err
                );
            } finally {
                redirectCheckDone = true;

                if (isMounted && !auth.currentUser) {
                    setLoading(false);
                }
            }
        };

        checkRedirect();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    /**
     * Context value
     */
    const value = {
        currentUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
