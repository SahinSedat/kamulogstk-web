const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

const SECRET = 'kamulogstk-webhook-secret-2026';
const PORT = 9000;
const APP_DIR = '/var/www/kamulogstk-web';

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/deploy') {
        let body = '';

        req.on('data', chunk => body += chunk.toString());

        req.on('end', () => {
            // Verify signature
            const signature = req.headers['x-hub-signature-256'];
            if (signature) {
                const hmac = crypto.createHmac('sha256', SECRET);
                const digest = 'sha256=' + hmac.update(body).digest('hex');
                if (signature !== digest) {
                    console.log('❌ Invalid signature');
                    res.writeHead(401);
                    res.end('Unauthorized');
                    return;
                }
            }

            console.log('🚀 Deployment triggered at', new Date().toISOString());
            res.writeHead(200);
            res.end('Deployment started');

            // Run deploy commands
            const commands = `
                cd ${APP_DIR} && 
                git pull origin main && 
                npm install && 
                npx prisma generate && 
                npm run build && 
                pm2 restart kamulogstk
            `;

            exec(commands, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Deployment failed:', error.message);
                    console.error(stderr);
                } else {
                    console.log('✅ Deployment successful!');
                    console.log(stdout);
                }
            });
        });
    } else {
        res.writeHead(200);
        res.end('Webhook server running');
    }
});

server.listen(PORT, () => {
    console.log(`🎯 Webhook server listening on port ${PORT}`);
});
