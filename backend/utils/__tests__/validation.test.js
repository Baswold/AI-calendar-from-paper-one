// =============================================================================
// Validation Utility Tests
// =============================================================================
//
// Comprehensive test suite for validation.js
// Run with: node validation.test.js
//
// Note: This is a simple test runner without external dependencies
// For production, consider using Jest, Mocha, or similar
//
// =============================================================================

const {
  sanitizeString,
  validateEventTitle,
  validateDate,
  validateTime,
  validateDescription,
  validateLocation,
  validateEvent,
  validateEvents
} = require('../validation');

// Simple test framework
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    process.stdout.write('.');
  } else {
    failed++;
    failures.push(message);
    process.stdout.write('F');
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    process.stdout.write('.');
  } else {
    failed++;
    failures.push(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
    process.stdout.write('F');
  }
}

function describe(suiteName, fn) {
  console.log(`\n\n${suiteName}`);
  fn();
}

function it(testName, fn) {
  try {
    fn();
  } catch (error) {
    failed++;
    failures.push(`${testName}: ${error.message}`);
    process.stdout.write('F');
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('sanitizeString', () => {
  it('should remove HTML tags', () => {
    const result = sanitizeString('<script>alert("xss")</script>Hello');
    assertEquals(result, 'Hello', 'Should remove script tags');
  });

  it('should remove angle brackets', () => {
    const result = sanitizeString('Test <b>bold</b> text');
    assertEquals(result, 'Test bold text', 'Should remove angle brackets');
  });

  it('should remove javascript: protocol', () => {
    const result = sanitizeString('javascript:alert("xss")');
    assertEquals(result, 'alert("xss")', 'Should remove javascript: protocol');
  });

  it('should remove event handlers', () => {
    const result = sanitizeString('Hello onclick="alert(xss)" World');
    assert(result.includes('Hello'), 'Should keep valid text');
    assert(result.includes('World'), 'Should keep valid text');
    assert(!result.includes('onclick'), 'Should remove onclick handler');
  });

  it('should trim whitespace', () => {
    const result = sanitizeString('  Hello World  ');
    assertEquals(result, 'Hello World', 'Should trim whitespace');
  });

  it('should handle non-string input', () => {
    const result = sanitizeString(123);
    assertEquals(result, '', 'Should return empty string for non-string');
  });

  it('should handle null input', () => {
    const result = sanitizeString(null);
    assertEquals(result, '', 'Should return empty string for null');
  });
});

describe('validateEventTitle', () => {
  it('should accept valid title', () => {
    const result = validateEventTitle('Team Meeting');
    assert(result.isValid, 'Should accept valid title');
    assertEquals(result.sanitized, 'Team Meeting', 'Should return sanitized title');
  });

  it('should reject empty title', () => {
    const result = validateEventTitle('');
    assert(!result.isValid, 'Should reject empty title');
  });

  it('should reject null title', () => {
    const result = validateEventTitle(null);
    assert(!result.isValid, 'Should reject null title');
  });

  it('should reject title that becomes empty after sanitization', () => {
    const result = validateEventTitle('   ');
    assert(!result.isValid, 'Should reject title that becomes empty after sanitization');
  });

  it('should reject title longer than 500 characters', () => {
    const longTitle = 'A'.repeat(501);
    const result = validateEventTitle(longTitle);
    assert(!result.isValid, 'Should reject title longer than 500 characters');
  });

  it('should sanitize XSS attempts', () => {
    const result = validateEventTitle('<script>alert("xss")</script>Meeting');
    assert(result.isValid, 'Should be valid after sanitization');
    assertEquals(result.sanitized, 'Meeting', 'Should remove script tags');
  });
});

describe('validateDate', () => {
  it('should accept valid date', () => {
    const result = validateDate('2025-01-15');
    assert(result.isValid, 'Should accept valid date');
    assertEquals(result.sanitized, '2025-01-15', 'Should return same date');
  });

  it('should reject invalid format', () => {
    const result = validateDate('01/15/2025');
    assert(!result.isValid, 'Should reject MM/DD/YYYY format');
  });

  it('should reject invalid date', () => {
    const result = validateDate('2025-02-30');
    assert(!result.isValid, 'Should reject February 30th');
  });

  it('should reject date before 1900', () => {
    const result = validateDate('1899-12-31');
    assert(!result.isValid, 'Should reject date before 1900');
  });

  it('should reject date after 2100', () => {
    const result = validateDate('2101-01-01');
    assert(!result.isValid, 'Should reject date after 2100');
  });

  it('should reject null', () => {
    const result = validateDate(null);
    assert(!result.isValid, 'Should reject null');
  });

  it('should reject empty string', () => {
    const result = validateDate('');
    assert(!result.isValid, 'Should reject empty string');
  });

  it('should accept leap year date', () => {
    const result = validateDate('2024-02-29');
    assert(result.isValid, 'Should accept valid leap year date');
  });

  it('should reject non-leap year Feb 29', () => {
    const result = validateDate('2025-02-29');
    assert(!result.isValid, 'Should reject Feb 29 in non-leap year');
  });
});

describe('validateTime', () => {
  it('should accept valid time', () => {
    const result = validateTime('14:30');
    assert(result.isValid, 'Should accept valid time');
    assertEquals(result.sanitized, '14:30', 'Should return same time');
  });

  it('should accept optional null time', () => {
    const result = validateTime(null, true);
    assert(result.isValid, 'Should accept null when optional');
    assertEquals(result.sanitized, null, 'Should return null');
  });

  it('should reject null when required', () => {
    const result = validateTime(null, false);
    assert(!result.isValid, 'Should reject null when required');
  });

  it('should reject invalid format', () => {
    const result = validateTime('2:30 PM');
    assert(!result.isValid, 'Should reject 12-hour format');
  });

  it('should reject invalid hour', () => {
    const result = validateTime('25:00');
    assert(!result.isValid, 'Should reject hour > 23');
  });

  it('should reject invalid minute', () => {
    const result = validateTime('14:60');
    assert(!result.isValid, 'Should reject minute > 59');
  });

  it('should accept midnight', () => {
    const result = validateTime('00:00');
    assert(result.isValid, 'Should accept midnight');
  });

  it('should accept 23:59', () => {
    const result = validateTime('23:59');
    assert(result.isValid, 'Should accept 23:59');
  });

  it('should accept single-digit hour', () => {
    const result = validateTime('9:30');
    assert(result.isValid, 'Should accept single-digit hour');
  });
});

describe('validateDescription', () => {
  it('should accept valid description', () => {
    const result = validateDescription('Team meeting to discuss project updates');
    assert(result.isValid, 'Should accept valid description');
  });

  it('should accept null description', () => {
    const result = validateDescription(null);
    assert(result.isValid, 'Should accept null description');
    assertEquals(result.sanitized, '', 'Should return empty string');
  });

  it('should accept empty description', () => {
    const result = validateDescription('');
    assert(result.isValid, 'Should accept empty description');
  });

  it('should reject description longer than 2000 characters', () => {
    const longDesc = 'A'.repeat(2001);
    const result = validateDescription(longDesc);
    assert(!result.isValid, 'Should reject description > 2000 characters');
  });

  it('should sanitize HTML', () => {
    const result = validateDescription('<b>Bold</b> text');
    assert(result.isValid, 'Should be valid after sanitization');
    assertEquals(result.sanitized, 'Bold text', 'Should remove HTML tags');
  });
});

describe('validateLocation', () => {
  it('should accept valid location', () => {
    const result = validateLocation('Conference Room A');
    assert(result.isValid, 'Should accept valid location');
  });

  it('should accept null location', () => {
    const result = validateLocation(null);
    assert(result.isValid, 'Should accept null location');
  });

  it('should reject location longer than 500 characters', () => {
    const longLoc = 'A'.repeat(501);
    const result = validateLocation(longLoc);
    assert(!result.isValid, 'Should reject location > 500 characters');
  });

  it('should sanitize HTML', () => {
    const result = validateLocation('<script>alert("xss")</script>Room 101');
    assert(result.isValid, 'Should be valid after sanitization');
    assertEquals(result.sanitized, 'Room 101', 'Should remove script tags');
  });
});

describe('validateEvent', () => {
  it('should accept valid complete event', () => {
    const event = {
      title: 'Team Meeting',
      date: '2025-01-15',
      startTime: '10:00',
      endTime: '11:00',
      description: 'Weekly sync',
      location: 'Room A'
    };
    const result = validateEvent(event);
    assert(result.isValid, 'Should accept valid event');
    assert(result.errors.length === 0, 'Should have no errors');
  });

  it('should accept event with minimal fields', () => {
    const event = {
      title: 'Meeting',
      date: '2025-01-15'
    };
    const result = validateEvent(event);
    assert(result.isValid, 'Should accept event with minimal fields');
  });

  it('should reject event with missing title', () => {
    const event = {
      date: '2025-01-15'
    };
    const result = validateEvent(event);
    assert(!result.isValid, 'Should reject event without title');
  });

  it('should reject event with missing date', () => {
    const event = {
      title: 'Meeting'
    };
    const result = validateEvent(event);
    assert(!result.isValid, 'Should reject event without date');
  });

  it('should reject null event', () => {
    const result = validateEvent(null);
    assert(!result.isValid, 'Should reject null event');
  });

  it('should sanitize all text fields', () => {
    const event = {
      title: '<b>Meeting</b>',
      date: '2025-01-15',
      description: '<script>alert("xss")</script>Important',
      location: '<i>Room</i> A'
    };
    const result = validateEvent(event);
    assert(result.isValid, 'Should be valid after sanitization');
    assertEquals(result.sanitized.title, 'Meeting', 'Should sanitize title');
    assertEquals(result.sanitized.description, 'Important', 'Should sanitize description');
    assertEquals(result.sanitized.location, 'Room A', 'Should sanitize location');
  });

  it('should collect all validation errors', () => {
    const event = {
      title: 'A'.repeat(501),
      date: '2025-02-30',
      startTime: '25:00'
    };
    const result = validateEvent(event);
    assert(!result.isValid, 'Should be invalid');
    assert(result.errors.length >= 3, 'Should have multiple errors');
  });
});

describe('validateEvents', () => {
  it('should accept array of valid events', () => {
    const events = [
      { title: 'Meeting 1', date: '2025-01-15' },
      { title: 'Meeting 2', date: '2025-01-16' }
    ];
    const result = validateEvents(events);
    assert(result.isValid, 'Should accept valid events');
    assertEquals(result.sanitized.length, 2, 'Should return 2 events');
  });

  it('should reject non-array input', () => {
    const result = validateEvents('not an array');
    assert(!result.isValid, 'Should reject non-array');
  });

  it('should reject empty array', () => {
    const result = validateEvents([]);
    assert(!result.isValid, 'Should reject empty array');
  });

  it('should reject array with more than 100 events', () => {
    const events = Array(101).fill({ title: 'Meeting', date: '2025-01-15' });
    const result = validateEvents(events);
    assert(!result.isValid, 'Should reject > 100 events');
  });

  it('should filter out invalid events and keep valid ones', () => {
    const events = [
      { title: 'Valid Meeting', date: '2025-01-15' },
      { title: '', date: '2025-01-16' }, // Invalid: empty title
      { title: 'Another Valid Meeting', date: '2025-01-17' }
    ];
    const result = validateEvents(events);
    assert(!result.isValid, 'Should be invalid due to invalid event');
    assert(result.errors.length > 0, 'Should have errors');
  });

  it('should sanitize all events', () => {
    const events = [
      { title: '<b>Meeting 1</b>', date: '2025-01-15' },
      { title: '<i>Meeting 2</i>', date: '2025-01-16' }
    ];
    const result = validateEvents(events);
    assert(result.isValid, 'Should be valid after sanitization');
    assertEquals(result.sanitized[0].title, 'Meeting 1', 'Should sanitize first event');
    assertEquals(result.sanitized[1].title, 'Meeting 2', 'Should sanitize second event');
  });
});

// =============================================================================
// Run Tests
// =============================================================================

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║       Validation Utility Test Suite                     ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// Run all tests
try {
  // Run test suites...
  // (tests are already run by describe/it calls above)
} catch (error) {
  console.error('\n\n❌ Test suite crashed:', error);
  process.exit(1);
}

// Print results
console.log('\n\n');
console.log('═'.repeat(60));
console.log('Test Results');
console.log('═'.repeat(60));
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);
console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═'.repeat(60));

if (failures.length > 0) {
  console.log('\n❌ FAILURES:\n');
  failures.forEach((failure, index) => {
    console.log(`${index + 1}. ${failure}\n`);
  });
}

if (failed === 0) {
  console.log('\n✨ All tests passed! ✨\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} test(s) failed\n`);
  process.exit(1);
}
