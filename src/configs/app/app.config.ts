/**
 * Exports a function that returns an object with the application configuration.
 * Get the port from the environment variables or use the default value.
 */

export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    organization: process.env.ORGANIZATION || 'NestJS',
    context: process.env.CONTEXT || 'NestJS',
    app: process.env.APP || 'api',
});
