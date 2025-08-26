const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for your existing FastAPI backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://backend:8000',
      changeOrigin: true,
      pathRewrite: {
        '^/api/db': '/api/db', // Keep db routes for the db-api service
      },
      router: {
        // Route /api/db requests to the db-api service
        '/api/db': 'http://db-api:8001',
      },
    })
  );
  
  // Specific proxy for database API routes
  app.use(
    '/api/db',
    createProxyMiddleware({
      target: 'http://db-api:8001',
      changeOrigin: true,
    })
  );
};