const axios = require('axios');

const pingServer = (url) => {
    // Ping every 14 minutes (14 * 60 * 1000 ms)
    // Render free tier sleeps after 15 mins of inactivity
    const PING_INTERVAL = 14 * 60 * 1000;

    console.log(`Setting up keep-alive ping for ${url} every 14 minutes`);

    setInterval(async () => {
        try {
            console.log(`Sending keep-alive ping to ${url}...`);
            const response = await axios.get(`${url}/health`);
            console.log(`Keep-alive ping successful: ${response.status}`);
        } catch (error) {
            console.error('Keep-alive ping failed:', error.message);
        }
    }, PING_INTERVAL);
};

module.exports = pingServer;
