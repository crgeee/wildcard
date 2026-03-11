module.exports = {
  apps: [
    {
      name: "wildcard",
      script: "apps/web/dist/server/start.js",
      cwd: "/var/www/wildcard",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        ALLOWED_ORIGIN: "https://wildcard.you",
      },
      max_memory_restart: "256M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
