import { recommend } from './services/haircutEngine.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('STRICT FILTERING VERIFICATION TEST');
console.log('All 4 filters must match: gender → ageGroup → faceShape → hairType');
console.log('═══════════════════════════════════════════════════════════\n');

const testCases = [
  {
    name: 'Adult Male - Oval - Straight',
    input: {gender:'male', ageGroup:'adult-male', faceShape:'oval', hairType:'straight', ethnicity:'all'},
    expectMatches: true
  },
  {
    name: 'Adult Female - Heart - Wavy',
    input: {gender:'female', ageGroup:'adult-female', faceShape:'heart', hairType:'wavy', ethnicity:'all'},
    expectMatches: true
  },
  {
    name: 'Teen Boy - Round - Curly',
    input: {gender:'male', ageGroup:'teen-boy', faceShape:'round', hairType:'curly', ethnicity:'all'},
    expectMatches: true
  },
  {
    name: 'Child Boy - Round - Straight',
    input: {gender:'male', ageGroup:'child-boy', faceShape:'round', hairType:'straight', ethnicity:'all'},
    expectMatches: true
  },
  {
    name: '❌ Wrong Gender (female request for male styles)',
    input: {gender:'female', ageGroup:'adult-male', faceShape:'oval', hairType:'straight', ethnicity:'all'},
    expectMatches: false
  },
  {
    name: '❌ Wrong Age (child request for adult styles)',
    input: {gender:'male', ageGroup:'child-boy', faceShape:'oval', hairType:'wavy', ethnicity:'all'},
    expectMatches: false // Should fail if no child entries with oval+wavy exist
  }
];

for (const test of testCases) {
  console.log(`\n📋 TEST: ${test.name}`);
  console.log(`   Input: gender=${test.input.gender}, age=${test.input.ageGroup}, face=${test.input.faceShape}, hair=${test.input.hairType}`);
  
  const results = await recommend({...test.input, min: 3, max: 6});
  
  console.log(`   ✓ Matches found: ${results.length}`);
  
  if (results.length > 0) {
    // Verify EVERY result matches ALL 4 filters
    let allValid = true;
    for (const r of results) {
      const genderMatch = r.gender === test.input.gender;
      const ageMatch = r.ageGroups?.includes(test.input.ageGroup);
      const faceMatch = r.faceShapes?.includes(test.input.faceShape);
      const hairMatch = r.hairTypes?.includes(test.input.hairType) || r.hairType === test.input.hairType;
      
      if (!genderMatch || !ageMatch || !faceMatch || !hairMatch) {
        allValid = false;
        console.log(`   ❌ VIOLATION: "${r.name}"`);
        console.log(`      Gender: ${genderMatch ? '✓' : '✗'} (${r.gender})`);
        console.log(`      Age: ${ageMatch ? '✓' : '✗'} (${r.ageGroups?.join(',')})`);
        console.log(`      Face: ${faceMatch ? '✓' : '✗'} (${r.faceShapes?.join(',')})`);
        console.log(`      Hair: ${hairMatch ? '✓' : '✗'} (${r.hairTypes?.join(',') || r.hairType})`);
      } else {
        console.log(`   ✓ "${r.name}" - ALL filters matched`);
      }
    }
    
    if (allValid) {
      console.log(`   ✅ PASS: All ${results.length} results strictly match all 4 filters`);
    } else {
      console.log(`   ❌ FAIL: Some results violated filtering rules`);
    }
  } else {
    console.log(`   ℹ️  No matches (correct if database lacks this combination)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════');
