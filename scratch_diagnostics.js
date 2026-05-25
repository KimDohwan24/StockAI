const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const config = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        config[key] = value;
    }
});

const appkey = config.KIS_APPKEY || 'PSDzpB6o4oytYSFYC74a4V1nerjivqm4usok';
const appsecret = config.KIS_APPSECRET || 'ZqsPOO+qZrU3kfHmI2Lve1hgRlE0j8K4E7mZA98NAI5R63NL/AZwr8gDZgaXn77WVUqN3rjt7R3fna13N1kfcwm91exCMkZ8gk7RqI+cCan10y4UKbYEVh+M4FEarGvdyAfZuRW+sw6o7VyfquABnR8LTuHY2zBnD/sqdTajbVH8QPy6JQ4=';
const baseUrl = 'https://openapi.koreainvestment.com:9443';

async function run() {
    // 1. Get Access Token
    const tokenRes = await fetch(`${baseUrl}/oauth2/tokenP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            appkey: appkey,
            appsecret: appsecret
        })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
        console.error("Failed to get access token");
        return;
    }

    const accessToken = "Bearer " + tokenData.access_token;

    // 2. Query search-info without PDNO
    console.log("\nQuerying search-info with PRDT_TYPE_CD = 300 (NO PDNO)...");
    const res = await fetch(`${baseUrl}/uapi/domestic-stock/v1/quotations/search-info?PRDT_TYPE_CD=300`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'authorization': accessToken,
            'appkey': appkey,
            'appsecret': appsecret,
            'tr_id': 'CTPF1604R',
            'tr_cont': 'N'
        }
    });
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response text:", text);
}

run().catch(console.error);
