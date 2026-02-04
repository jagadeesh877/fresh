const axios = require('axios');

async function run() {
    const baseURL = 'http://localhost:3000/api';
    let token = '';

    try {
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        token = loginRes.data.accessToken;

        // Fetch absences for 2026-01-30
        const date = '2026-01-30';
        console.log(`Fetching absences for ${date}...`);

        const res = await axios.get(`${baseURL}/admin/faculty-absences`, {
            params: { date },
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(res.data, null, 2));

        if (Array.isArray(res.data)) {
            console.log("\nFrontend expects: res.data.map(a => a.facultyId)");
            const ids = res.data.map(a => a.facultyId);
            console.log("Mapped IDs:", ids);
        } else {
            console.error("Response is not an array!");
        }

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

run();
