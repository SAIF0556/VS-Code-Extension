// src/services/AuthService.js
const http = require('http');
const crypto = require('crypto');
const fetch = require('node-fetch');
const vscode = require("vscode");
const { GoogleAuthProvider, signInWithCredential, signOut } = require("firebase/auth");
const { auth } = require("../config/firebase");
const { firebaseConfig } = require("../config/firebase");
const { debugLog } = require("../utils/debug");

class AuthService {
    static async login(webviewProvider) {
        try {
            debugLog('Starting login process');
            const server = http.createServer();
            const state = crypto.randomBytes(16).toString('hex');
            
            await new Promise((resolve) => {
                server.listen(0, 'localhost', () => {
                    debugLog('Local server started');
                    resolve();
                });
            });

            const port = server.address().port;
            
            server.on('request', async (req, res) => {
                if (req.url.startsWith('/oauth/callback')) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(AuthService.getCallbackHtml());
                } else if (req.url.startsWith('/oauth/tokens')) {
                    await AuthService.handleTokens(req, res, port, state, webviewProvider);
                    server.close();
                }
            });

            const redirectUri = `http://localhost:${port}/oauth/callback`;
            const authUrl = AuthService.buildAuthUrl(redirectUri, state);
            
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            vscode.window.showInformationMessage('Please complete the sign-in in your browser.');

        } catch (error) {
            vscode.window.showErrorMessage(`Login failed: ${error.message}`);
            console.error("Login error details:", error);
        }
    }

    static async handleTokens(req, res, port, state, webviewProvider) {
    const urlParams = new URL(req.url, `http://localhost:${port}`).searchParams;
    const accessToken = urlParams.get('access_token');
    const receivedState = urlParams.get('state');

    try {
        // Validate state parameter first
        if (receivedState !== state) {
            debugLog('Invalid state parameter received');
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid state parameter');
            return;
        }

        if (!accessToken) {
            debugLog('No access token received');
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('No access token provided');
            return;
        }

        debugLog('Received OAuth callback tokens');
        const userInfo = await AuthService.getUserInfo(accessToken);
        debugLog('User info fetched:', userInfo.email);

        const credential = GoogleAuthProvider.credential(null, accessToken);
        await signInWithCredential(auth, credential);
        debugLog('Firebase credential created and signed in');
        
        // Send success response
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Authentication successful');

        // Show the main interface after successful login
        if (webviewProvider) {
            webviewProvider.showMainInterface();
            vscode.window.showInformationMessage(`Logged in as ${userInfo.email}`);
        }
        
    } catch (error) {
        debugLog('Error during authentication:', error.message);
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Authentication failed: ${error.message}`);
        }
        vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
    }
}

    static async logout() {
        try {
            await signOut(auth);
            vscode.window.showInformationMessage("Logged out successfully!");
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to logout: ${error.message}`);
        }
    }

    static getCallbackHtml() {
        return `
            <!DOCTYPE html>
            <html>
                <body>
                    <script>
                        const params = new URLSearchParams(window.location.hash.substring(1));
                        const accessToken = params.get('access_token');
                        const state = params.get('state');
                        
                        fetch('/oauth/tokens?' + new URLSearchParams({
                            access_token: accessToken,
                            state: state
                        })).then(() => {
                            document.body.innerHTML = '<h1>Successfully signed in! You can close this window.</h1>';
                        });
                    </script>
                    <h1>Processing authentication...</h1>
                </body>
            </html>
        `;
    }

    static async getUserInfo(accessToken) {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        return await userInfoResponse.json();
    }

    static buildAuthUrl(redirectUri, state) {
        const clientId = firebaseConfig.clientId;
        return `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}` +
            `&state=${state}` +
            `&flowName=GeneralOAuthFlow`;
    }
}

module.exports = AuthService;