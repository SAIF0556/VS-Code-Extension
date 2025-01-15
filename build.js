const { build } = require('electron-builder');
const path = require('path');

async function buildMsix() {
    try {
        console.log('Starting build process...');

        // Build MSIX package
        await build({
            targets: 'win',
            config: {
                directories: {
                    output: path.join(__dirname, 'dist'),
                    buildResources: path.join(__dirname, 'build')
                },
                win: {
                    target: 'msix',
                    icon: 'resources/firebase.ico',
                    certificateFile: 'certificate.pfx',
                    certificatePassword: process.env.CERT_PASSWORD || 'YourPassword123!'
                },
                msix: {
                    applicationId: 'SaifFirebasePlugin',
                    identityName: 'SaifFirebasePlugin',
                    displayName: 'Saif Firebase Plugin',
                    publisher: 'CN=YourCompanyName',
                    publisherDisplayName: 'Saif Developer',
                    languages: ['en-US']
                }
            }
        });

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

buildMsix();