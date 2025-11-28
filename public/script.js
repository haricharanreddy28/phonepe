document.getElementById('paymentForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const payBtn = document.getElementById('payBtn');
    const messageDiv = document.getElementById('message');

    // Disable button and show loading state
    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';
    messageDiv.textContent = '';

    const name = document.getElementById('name').value;
    const mobile = document.getElementById('mobile').value;
    const amount = document.getElementById('amount').value;

    try {
        // Use relative path for production deployment
        const response = await fetch('/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, mobile, amount })
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to PhonePe
            window.location.href = data.url;
        } else {
            messageDiv.textContent = 'Error: ' + data.message;
            messageDiv.className = 'error';
            payBtn.disabled = false;
            payBtn.textContent = 'Pay Now';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.textContent = 'Something went wrong: ' + error.message;
        messageDiv.className = 'error';
        payBtn.disabled = false;
        payBtn.textContent = 'Pay Now';
    }
});
