// Test script to verify Moralis address filtering fix
const { addAddressesToStream } = require('./src/thirdparty/Moralis');

async function testAddressFiltering() {
  console.log('Testing Moralis address filtering...');
  
  // Test addresses - mix of EVM and non-EVM
  const testAddresses = [
    '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Valid EVM address
    'T7d680971e66a9a5774cc51283082c32213951497',   // Tron address (should be filtered out)
    '0x1234567890123456789012345678901234567890',   // Valid EVM address
    'TJYeasTPa6gpEEiNGdifFcaKnw5YnTmZoz',          // Another Tron address
    '0xabcdef1234567890abcdef1234567890abcdef12'    // Valid EVM address
  ];
  
  try {
    const result = await addAddressesToStream(testAddresses);
    console.log('Test completed successfully:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAddressFiltering(); 