// js/auth.js - Add this file to your project
class AuthManager {
    constructor() {
        this.tokenKey = 'ggpc_auth_token';
        this.userKey = 'ggpc_current_user';
    }

    // Store authentication token and user info
    setAuth(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, user);
    }

    // Get stored token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Get stored user
    getUser() {
        return localStorage.getItem(this.userKey);
    }

    // Clear authentication
    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const token = this.getToken();
        
        if (!token) {
            return false;
        }

        try {
            const response = await fetch('/.netlify/functions/verify-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const result = await response.json();
            
            if (result.success) {
                return true;
            } else {
                // Token is invalid or expired, clear it
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            return false;
        }
    }

    // Redirect to login if not authenticated
    async requireAuth() {
        const authenticated = await this.isAuthenticated();
        
        if (!authenticated) {
            // Store the current page they were trying to access
            localStorage.setItem('redirect_after_login', window.location.pathname);
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }

    // Logout function
    logout() {
        this.clearAuth();
        window.location.href = 'index.html';
    }

    // Get redirect URL after login
    getRedirectUrl() {
        const redirectUrl = localStorage.getItem('redirect_after_login');
        localStorage.removeItem('redirect_after_login');
        return redirectUrl || 'dashboard.html';
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();