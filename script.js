document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Stops the page from refreshing

    // Collects data from your HTML input fields
    const reportData = {
        incident_type: document.getElementById('type').value,
        incident_date: document.getElementById('date').value,
        description: document.getElementById('description').value
    };

    try {
        // Sends the data to your Render website
        const response = await fetch('/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        if (response.ok) {
            alert('✅ Report Submitted Anonymously!');
            e.target.reset(); // Clears the form
        } else {
            alert('❌ Error: Could not connect to the server.');
        }
    } catch (error) {
        console.error('Submission failed:', error);
    }
});
