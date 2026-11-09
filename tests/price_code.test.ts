import {
  DEFAULT_PRICE_CODE_MAPPING,
  INITIAL_PRICE_CODE_VERSION,
  encodeAmountToCode,
  decodeCodeToAmount,
  validateMapping,
  calculateSaleMinimum,
  isSaleRateBelowMinimum,
} from '../src/utils/priceCode';
import { PriceCodeMapping } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

console.log('--- RUNNING PRICE CODE CALCULATOR TESTS ---');

// 1. Secret Price Code Mapping Test Cases from prompt
// Amount 600 -> HMM
const res600 = encodeAmountToCode(600);
assert(res600.code === 'HMM', `Expected 600 -> HMM, got "${res600.code}"`);
console.log('PASS: 600 -> HMM');

// Amount 700 -> AMM
const res700 = encodeAmountToCode(700);
assert(res700.code === 'AMM', `Expected 700 -> AMM, got "${res700.code}"`);
console.log('PASS: 700 -> AMM');

// Amount 500 -> CMM
const res500 = encodeAmountToCode(500);
assert(res500.code === 'CMM', `Expected 500 -> CMM, got "${res500.code}"`);
console.log('PASS: 500 -> CMM');

// Amount 550 -> CCM (5=C, 5=C, 0=M)
const res550 = encodeAmountToCode(550);
assert(res550.code === 'CCM', `Expected 550 -> CCM, got "${res550.code}"`);
console.log('PASS: 550 -> CCM');

// Amount 1250 -> SRCM
const res1250 = encodeAmountToCode(1250);
assert(res1250.code === 'SRCM', `Expected 1250 -> SRCM, got "${res1250.code}"`);
console.log('PASS: 1250 -> SRCM');

// Amount 2500 -> RCMM
const res2500 = encodeAmountToCode(2500);
assert(res2500.code === 'RCMM', `Expected 2500 -> RCMM, got "${res2500.code}"`);
console.log('PASS: 2500 -> RCMM');

// 2. Decode Code -> Amount
assert(decodeCodeToAmount('HMM').amount === 600, 'Expected HMM -> 600');
assert(decodeCodeToAmount('AMM').amount === 700, 'Expected AMM -> 700');
assert(decodeCodeToAmount('CMM').amount === 500, 'Expected CMM -> 500');
assert(decodeCodeToAmount('CCM').amount === 550, 'Expected CCM -> 550');
assert(decodeCodeToAmount('SRCM').amount === 1250, 'Expected SRCM -> 1250');
assert(decodeCodeToAmount('RCMM').amount === 2500, 'Expected RCMM -> 2500');
console.log('PASS: Bidirectional decoding accurate for all sample values');

// 3. Variable code lengths
assert(encodeAmountToCode(5).code === 'C', 'Expected 5 -> C (length 1)');
assert(encodeAmountToCode(99).code === 'DD', 'Expected 99 -> DD (length 2)');
assert(encodeAmountToCode(100000).code === 'SMMMMM', 'Expected 100000 -> SMMMMM (length 6)');
assert(decodeCodeToAmount('SMMMMM').amount === 100000, 'Expected SMMMMM -> 100000');
console.log('PASS: Variable code lengths handled properly');

// 4. Case-insensitivity & whitespace trimming
assert(decodeCodeToAmount('  hmm  ').amount === 600, 'Expected "  hmm  " -> 600');
assert(decodeCodeToAmount('srcm').amount === 1250, 'Expected lowercase "srcm" -> 1250');
assert(encodeAmountToCode('  600  ').code === 'HMM', 'Expected "  600  " -> HMM');
console.log('PASS: Whitespace trimmed and case-insensitive');

// 5. Invalid characters & validation
const invLetter = decodeCodeToAmount('XYZ');
assert(!!invLetter.error, 'Expected error for unmapped letters XYZ');
console.log('PASS: Invalid letters rejected with clear message:', invLetter.error);

// 6. Decimal rejection
const decimal1 = encodeAmountToCode('600.50');
assert(!!decimal1.error, 'Expected error for decimal amounts');
const decimal2 = encodeAmountToCode(600.75);
assert(!!decimal2.error, 'Expected error for fractional number amounts');
console.log('PASS: Decimals strictly rejected');

// 7. Negative amount rejection
const neg = encodeAmountToCode('-500');
assert(!!neg.error, 'Expected error for negative amounts');
console.log('PASS: Negative amounts rejected');

// 8. Mapping validation - duplicates & incomplete mappings
const validCheck = validateMapping(DEFAULT_PRICE_CODE_MAPPING);
assert(validCheck.isValid === true, 'Default mapping must be valid');

const dupMapping: PriceCodeMapping = {
  ...DEFAULT_PRICE_CODE_MAPPING,
  '0': 'S', // S already used for 1
};
const dupCheck = validateMapping(dupMapping);
assert(dupCheck.isValid === false, 'Duplicate letter in mapping must be rejected');
console.log('PASS: Duplicate letter in mapping caught:', dupCheck.error);

const missingMapping: any = { ...DEFAULT_PRICE_CODE_MAPPING };
delete missingMapping['9'];
const missingCheck = validateMapping(missingMapping);
assert(missingCheck.isValid === false, 'Missing digit mapping must be rejected');
console.log('PASS: Incomplete mapping caught:', missingCheck.error);

// 9. Older version decoding test
const customV2Mapping: PriceCodeMapping = {
  '0': 'Z',
  '1': 'A',
  '2': 'B',
  '3': 'C',
  '4': 'D',
  '5': 'E',
  '6': 'F',
  '7': 'G',
  '8': 'H',
  '9': 'I',
};
const v2Code = encodeAmountToCode(600, customV2Mapping);
assert(v2Code.code === 'FZZ', `Expected 600 in v2 -> FZZ, got "${v2Code.code}"`);
assert(decodeCodeToAmount('FZZ', customV2Mapping).amount === 600, 'Expected FZZ in v2 -> 600');
// In v1, FZZ would fail because F and Z are not in SRIOCHANDM
assert(!!decodeCodeToAmount('FZZ', DEFAULT_PRICE_CODE_MAPPING).error, 'FZZ must fail under v1');
console.log('PASS: Older/Custom version decoding operates independently');

// 10. Sale Minimum and Below-Minimum Warning
// Buy 550, Profit 50 -> Sale Minimum 600
const saleMin = calculateSaleMinimum(550, 50);
assert(saleMin === 600, `Expected sale minimum 600, got ${saleMin}`);
assert(encodeAmountToCode(saleMin).code === 'HMM', 'Expected sale minimum code HMM');

// Additional sale price 700 -> AMM
const addCode = encodeAmountToCode(700);
assert(addCode.code === 'AMM', 'Expected additional sale price code AMM');

// Below minimum warning test: Actual sale rate 580 < 600
assert(isSaleRateBelowMinimum(580, saleMin) === true, '580 < 600 should trigger below minimum warning');
assert(isSaleRateBelowMinimum(600, saleMin) === false, '600 >= 600 should not trigger warning');
assert(isSaleRateBelowMinimum(700, saleMin) === false, '700 >= 600 should not trigger warning');
console.log('PASS: Sale Minimum & Below-Minimum Warning calculations verified');

console.log('ALL PRICE CODE CALCULATOR TESTS PASSED SUCCESSFULLY!');
