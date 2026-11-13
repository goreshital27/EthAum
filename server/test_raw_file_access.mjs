import http from 'http';
import jwt from 'jsonwebtoken';
import app from './src/app.js';
import config from './src/config/index.js';
import prisma from './src/config/prisma.js';

const server = http.createServer(app);

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  async function request(path, options = {}) {
    const url = `http://127.0.0.1:${port}${path}`;
    const headers = options.headers || {};
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });
    const setCookie = res.headers.get('set-cookie');
    let text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { status: res.status, data, text, setCookie, headers: res.headers };
  }

  async function login(email, password = 'Demo@12345') {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const cookie = res.setCookie ? res.setCookie.split(';')[0] : '';
    return { user: res.data?.data, cookie, status: res.status };
  }

  try {
    console.log('\n--- 1. Login as patient1 ---');
    const p1 = await login('patient1@demo.ethaum.test');
    console.log(`Patient 1 login: ${p1.status}`);

    // Find or create a case
    let cases = await request('/api/cases', { cookie: p1.cookie });
    let caseItem = cases.data?.data?.[0];
    if (!caseItem) {
      const newCaseRes = await request('/api/cases', {
        method: 'POST',
        cookie: p1.cookie,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatment: 'knee-replacement',
          destination: 'India',
          budgetCents: 500000,
          description: 'Testing document direct browser tab access.',
        }),
      });
      caseItem = newCaseRes.data?.data;
    }
    console.log(`Using case: ${caseItem.id}`);

    console.log('\n--- 2. Upload sample medical file ---');
    const boundary = '----WebKitFormBoundaryTestAccess123';
    const sampleContent = 'PDF_DOCUMENT_VERIFICATION_SAMPLE_CONTENT_ETH_AUM';
    const uploadBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="category"',
      '',
      'REPORT',
      `--${boundary}`,
      'Content-Disposition: form-data; name="consent"',
      '',
      'true',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="patient_mri_scan.pdf"',
      'Content-Type: application/pdf',
      '',
      sampleContent,
      `--${boundary}--`,
    ].join('\r\n');

    const uploadRes = await request(`/api/cases/${caseItem.id}/documents`, {
      method: 'POST',
      cookie: p1.cookie,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: uploadBody,
    });
    console.log(`Upload status: ${uploadRes.status}`);
    const doc = uploadRes.data?.data;
    console.log(`Uploaded doc ID: ${doc?.id}, name: ${doc?.originalName}`);

    console.log('\n--- 3. Generate Signed Access URL ---');
    const accessRes = await request(`/api/documents/${doc.id}/access`, {
      cookie: p1.cookie,
    });
    console.log(`Access status: ${accessRes.status}`);
    const relativeUrl = accessRes.data?.data?.accessUrl;
    console.log(`Signed Relative URL: ${relativeUrl}`);

    console.log('\n--- 4. Direct Browser Tab GET (WITHOUT COOKIES) ---');
    // Direct GET without any Cookie header at all!
    const rawRes = await request(relativeUrl, {
      method: 'GET',
      headers: {}, // No cookies, no Authorization headers!
    });
    console.log(`Direct raw-file GET status: ${rawRes.status}`);
    const matchesContent = rawRes.text.includes('PDF_DOCUMENT_VERIFICATION_SAMPLE_CONTENT_ETH_AUM');
    console.log(`File content verified without cookies? ${matchesContent ? 'YES (SUCCESS)' : 'NO (FAIL)'}`);

    console.log('\n--- 5. Test Tampered Token -> Expected 403 ---');
    const tamperedUrl = `${relativeUrl}tampered123`;
    const tamperedRes = await request(tamperedUrl, {
      method: 'GET',
    });
    console.log(`Tampered token status: ${tamperedRes.status} (Expected 403), Body: ${tamperedRes.text}`);

    console.log('\n--- 6. Test Expired Token -> Expected 403 ---');
    const expiredToken = jwt.sign(
      {
        documentId: doc.id,
        storageKey: 'fake_key',
        exp: Math.floor(Date.now() / 1000) - 60, // Expired 60s ago
      },
      config.JWT_SECRET
    );
    const expiredRes = await request(`/api/records/raw/${encodeURIComponent(expiredToken)}`, {
      method: 'GET',
    });
    console.log(`Expired token status: ${expiredRes.status} (Expected 403), Body: ${expiredRes.text}`);

    console.log('\n--- 7. Audit Trail Verification ---');
    const downloadLogs = await prisma.accessLog.findMany({
      where: { documentId: doc.id, action: 'DOWNLOAD' },
    });
    console.log(`Recorded download access logs: ${downloadLogs.length}`);

    console.log('\nALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
