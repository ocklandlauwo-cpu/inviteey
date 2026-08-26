module.exports = {
  apps: [
    {
      name: "invitee-web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 2,
      exec_mode: "cluster",
      env: { NODE_ENV: "production", PORT: 3000 },
    },
    {
      name: "invitee-workers",
      script: "src/workers/index.ts",
      interpreter: "node_modules/.bin/tsx",
      instances: 1,
      env: { NODE_ENV: "production" },
    },
  ],
};
