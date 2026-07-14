async function run() {
  console.log('Sending request to local vercel api/transcript...');
  try {
    const res = await fetch('http://localhost:3000/api/transcript?videoId=CyQyZzpEMyc');
    console.log('Status:', res.status);
    const data = await res.json().catch(() => null);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  console.log('\nSending request to local vercel api/generate...');
  try {
    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: 'Hello, testing local generate API' })
    });
    console.log('Status:', res.status);
    const data = await res.json().catch(() => null);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

run();
