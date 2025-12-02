import { recommend } from './services/haircutEngine.js';

async function test() {
  console.log('Testing hairstyleDatabase.json...\n');
  
  // Test 1: Adult male with oval face
  console.log('Test 1: Adult male, oval face');
  const test1 = await recommend({ gender: 'male', ageGroup: 'adult-male', faceShape: 'oval', min: 6, max: 10 });
  console.log(`  Returned ${test1.length} hairstyles`);
  console.log(`  First result: ${test1[0]?.name || 'None'}`);
  console.log(`  Images unique: ${new Set(test1.map(h => h.image)).size === test1.length}\n`);
  
  // Test 2: Teen girl with round face
  console.log('Test 2: Teen girl, round face');
  const test2 = await recommend({ gender: 'female', ageGroup: 'teen-girl', faceShape: 'round', min: 6, max: 10 });
  console.log(`  Returned ${test2.length} hairstyles`);
  console.log(`  First result: ${test2[0]?.name || 'None'}`);
  console.log(`  Images unique: ${new Set(test2.map(h => h.image)).size === test2.length}\n`);
  
  // Test 3: Child boy with square face
  console.log('Test 3: Child boy, square face');
  const test3 = await recommend({ gender: 'male', ageGroup: 'child-boy', faceShape: 'square', min: 6, max: 10 });
  console.log(`  Returned ${test3.length} hairstyles`);
  console.log(`  First result: ${test3[0]?.name || 'None'}`);
  console.log(`  Images unique: ${new Set(test3.map(h => h.image)).size === test3.length}\n`);

  // Test 4: Adult female with heart face
  console.log('Test 4: Adult female, heart face');
  const test4 = await recommend({ gender: 'female', ageGroup: 'adult-female', faceShape: 'heart', min: 6, max: 10 });
  console.log(`  Returned ${test4.length} hairstyles`);
  console.log(`  First result: ${test4[0]?.name || 'None'}`);
  console.log(`  Images unique: ${new Set(test4.map(h => h.image)).size === test4.length}\n`);

  console.log('✓ All tests completed!');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
