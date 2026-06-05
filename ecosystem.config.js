module.exports = {
  apps: [
    {
      name: "kamulog-panel",
      script: "node_modules/.bin/next",
      args: "start -p 3100",
      cwd: "/home/kamulog/kamulogWebYonetim",
      env: {
        NODE_ENV: "production",
        PORT: 3100,
        WHATSAPP_BOT_URL: "http://localhost:3101",
        NODE_OPTIONS: "--dns-result-order=ipv4first --max-old-space-size=1024",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 1000,
    },
    {
      name: "kamulog-whatsapp",
      script: "scripts/whatsapp-bot.js",
      cwd: "/home/kamulog/kamulogWebYonetim",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
