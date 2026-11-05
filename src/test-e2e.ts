async function runTests() {
  const BASE_URL = 'http://localhost:5000';
  let cookieHeader = '';
  let testStudioId = '';
  let testBookingId = '';

  console.log('=============================================');
  console.log('🧪 STUDIOSPACE COMPREHENSIVE AUTOMATED TESTS');
  console.log('=============================================');

  // 1. Health Endpoint
  console.log('\n[Test 1] Health Check GET /api/health');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  if (healthRes.ok && healthData.status === 'ok') {
    console.log('✅ Health check PASSED:', healthData);
  } else {
    throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
  }

  // 2. Authentication: Login with seeded Host
  console.log('\n[Test 2] Host Login POST /api/auth/login');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'elena@studiospace.io',
      password: 'StudioSpace2025!',
    }),
  });
  const loginData = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie');
  if (loginRes.ok && loginData.success && setCookie) {
    cookieHeader = setCookie.split(';')[0];
    console.log('✅ Host login PASSED, received auth_token cookie:', cookieHeader);
  } else {
    throw new Error(`Host login failed: ${JSON.stringify(loginData)}`);
  }

  // 3. Authenticated Session GET /api/auth/me
  console.log('\n[Test 3] Session Verification GET /api/auth/me');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meData = await meRes.json();
  if (meRes.ok && meData.user && meData.user.email === 'elena@studiospace.io') {
    console.log('✅ Session verified PASSED for user:', meData.user.name);
  } else {
    throw new Error(`Session verification failed: ${JSON.stringify(meData)}`);
  }

  // 4. Explore Studios with Filters GET /api/studios
  console.log('\n[Test 4] Studio Directory GET /api/studios?category=Photo+Studios');
  const studiosRes = await fetch(`${BASE_URL}/api/studios?category=Photo+Studios`);
  const studiosData = await studiosRes.json();
  if (studiosRes.ok && studiosData.success && Array.isArray(studiosData.data)) {
    console.log(`✅ Explore studios PASSED, found ${studiosData.data.length} photo studios.`);
  } else {
    throw new Error(`Explore studios failed: ${JSON.stringify(studiosData)}`);
  }

  // 5. Create Studio Listing POST /api/studios
  console.log('\n[Test 5] Studio Creation POST /api/studios');
  const createStudioRes = await fetch(`${BASE_URL}/api/studios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: 'Automated Test Loft Studio',
      category: 'Photo Studios',
      hourlyRate: 150,
      securityDeposit: 200,
      maxCapacity: 12,
      location: 'DUMBO, Brooklyn, NY',
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      gallery: ['https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'],
      amenities: ['14ft Ceilings', 'Profoto Gear', 'Private Freight Elevator'],
      overview: 'Curated industrial loft with south-facing windows for test verification.',
    }),
  });
  const createStudioData = await createStudioRes.json();
  if (createStudioRes.ok && createStudioData.studioId) {
    testStudioId = createStudioData.studioId;
    console.log('✅ Studio creation PASSED, studioId:', testStudioId);
  } else {
    throw new Error(`Studio creation failed: ${JSON.stringify(createStudioData)}`);
  }

  // 6. Update Studio Listing PUT /api/studios/:id
  console.log('\n[Test 6] Studio Update PUT /api/studios/' + testStudioId);
  const updateStudioRes = await fetch(`${BASE_URL}/api/studios/${testStudioId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: 'Automated Test Loft Studio (Updated)',
      category: 'Photo Studios',
      hourlyRate: 175,
      securityDeposit: 250,
      maxCapacity: 15,
      location: 'DUMBO, Brooklyn, NY',
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      gallery: ['https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'],
      amenities: ['14ft Ceilings', 'Profoto Gear', 'Private Freight Elevator', 'Espresso Bar'],
      overview: 'Curated industrial loft with south-facing windows for test verification (Updated).',
    }),
  });
  const updateStudioData = await updateStudioRes.json();
  if (updateStudioRes.ok && updateStudioData.success) {
    console.log('✅ Studio update PASSED:', updateStudioData.message);
  } else {
    throw new Error(`Studio update failed: ${JSON.stringify(updateStudioData)}`);
  }

  // 7. Creator Login & Booking Creation
  console.log('\n[Test 7] Creator Login & Reservation POST /api/bookings');
  const creatorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'marcus@creator.io',
      password: 'StudioSpace2025!',
    }),
  });
  const creatorLoginData = await creatorLoginRes.json();
  const creatorCookie = creatorLoginRes.headers.get('set-cookie')!.split(';')[0];

  const futureDate = '2026-11-20';
  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: creatorCookie,
    },
    body: JSON.stringify({
      studioId: testStudioId,
      bookingDate: futureDate,
      startTime: '10:00',
      endTime: '14:00',
    }),
  });
  const bookData = await bookRes.json();
  if (bookRes.ok && bookData.bookingId) {
    testBookingId = bookData.bookingId;
    console.log('✅ Booking creation PASSED, status is Pending, bookingId:', testBookingId);
  } else {
    throw new Error(`Booking creation failed: ${JSON.stringify(bookData)}`);
  }

  // 8. Host Confirms Booking PATCH /api/bookings/:id/status
  console.log('\n[Test 8] Host Confirms Booking PATCH /api/bookings/' + testBookingId + '/status');
  const confirmRes = await fetch(`${BASE_URL}/api/bookings/${testBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader, // Host cookie
    },
    body: JSON.stringify({ status: 'Confirmed' }),
  });
  const confirmData = await confirmRes.json();
  if (confirmRes.ok && confirmData.success) {
    console.log('✅ Host status update to Confirmed PASSED');
  } else {
    throw new Error(`Host confirmation failed: ${JSON.stringify(confirmData)}`);
  }

  // 9. Double Booking Collision Challenge: Attempt Overlapping Booking on Same Date/Time
  console.log('\n[Test 9] Double Booking Collision Check (Expect HTTP 409)');
  const collisionRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: creatorCookie,
    },
    body: JSON.stringify({
      studioId: testStudioId,
      bookingDate: futureDate,
      startTime: '12:00', // Overlaps with 10:00 - 14:00 Confirmed booking!
      endTime: '16:00',
    }),
  });
  const collisionData = await collisionRes.json();
  if (collisionRes.status === 409 && !collisionData.success) {
    console.log('✅ Double-booking collision rejection PASSED with HTTP 409 Conflict:');
    console.log('   Message:', collisionData.message);
  } else {
    throw new Error(`Expected HTTP 409 for collision, got ${collisionRes.status}: ${JSON.stringify(collisionData)}`);
  }

  // 10. Dashboard Stats
  console.log('\n[Test 10] Dashboard Stats GET /api/dashboard/stats');
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Cookie: cookieHeader },
  });
  const statsData = await statsRes.json();
  if (statsRes.ok && statsData.success && statsData.data.metrics) {
    console.log('✅ Dashboard stats PASSED, host metrics:', statsData.data.metrics);
  } else {
    throw new Error(`Dashboard stats failed: ${JSON.stringify(statsData)}`);
  }

  // 11. Cleanup Test Studio Deletion DELETE /api/studios/:id
  console.log('\n[Test 11] Studio Deletion DELETE /api/studios/' + testStudioId);
  const deleteRes = await fetch(`${BASE_URL}/api/studios/${testStudioId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader },
  });
  const deleteData = await deleteRes.json();
  if (deleteRes.ok && deleteData.success) {
    console.log('✅ Studio deletion PASSED:', deleteData.message);
  } else {
    throw new Error(`Studio deletion failed: ${JSON.stringify(deleteData)}`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL 11 AUTOMATED VERIFICATION TESTS PASSED!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
