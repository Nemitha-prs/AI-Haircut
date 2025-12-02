import { recommend } from './services/haircutEngine.js';

const cases = [
  {gender:'male', ageGroup:'adult-male', faceShape:'oval', hairType:'straight', ethnicity:'all'},
  {gender:'male', ageGroup:'adult-male', faceShape:'round', hairType:'curly', ethnicity:'all'},
  {gender:'female', ageGroup:'adult-female', faceShape:'oval', hairType:'wavy', ethnicity:'all'},
  {gender:'male', ageGroup:'child-boy', faceShape:'round', hairType:'straight', ethnicity:'all'}
];

console.log('STRICT FILTERING TEST\n');
for (const c of cases) {
  const res = await recommend({...c, min: 3, max: 6});
  console.log('INPUT:', JSON.stringify(c));
  console.log('MATCHES:', res.length);
  for (const r of res) {
    console.log('  ✓', r.name, '| shapes:', r.faceShapes?.join(','), '| hair:', r.hairType || r.hairTypes?.join(','), '| age:', r.ageGroups?.join(','));
  }
  console.log('');
}
