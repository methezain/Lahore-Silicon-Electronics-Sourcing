

async function testOrder() {
  const payload = {
    name: "John Doe",
    phone: "03001234567",
    address: "123 Test Street, Lahore",
    payment_ref: "123456789012",
    items: [
      {
        part_number: "ESP32-WROOM-32D",
        name: "Wi-Fi Module",
        price: 1250,
        quantity: 2
      }
    ],
    total: 2500,
    turnstile_token: "dummy_token"
  };

  try {
    const res = await fetch('http://localhost:4321/api/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Response Status:", res.status);
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testOrder();
