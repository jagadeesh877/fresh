const axios = require('axios');

async function test() {
    try {
        // Assuming facultyId 8 exists (from the screenshot) and date '2026-02-02'
        const response = await axios.delete('http://localhost:3000/api/admin/faculty-absences', {
            params: {
                facultyId: 8,
                date: '2026-02-02',
                period: 3,
                mode: 'from_period'
            }
        });
        console.log('Response:', response.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

test();
