import { describe,expect,it } from 'vitest';
import { formatWagonNumber } from '../../client/src/WagonNumberInput';
import { wagonTypeFromNumber } from '../../shared/wagon-types';

describe('vagon numarası ve tip eşleştirmesi',()=>{
 it('ikinci blokta üç veya dört rakamı kabul eder',()=>{
  expect(formatWagonNumber('31755683375')).toBe('3175 568 337-5');
  expect(formatWagonNumber('317545683375')).toBe('3175 4568 337-5');
 });
 it('tam kodu önekten önce seçer; bilinmeyen kodu tahmin etmez',()=>{
  expect(wagonTypeFromNumber('3175 4568 337-5')).toBe('Sgss-w');
  expect(wagonTypeFromNumber('3175 5379 337-5')).toBe('Eanoss');
  expect(wagonTypeFromNumber('3175 537 337-5')).toBe('Eanoss (TSI)');
  expect(wagonTypeFromNumber('3175 568 337-5')).toBe('');
 });
});
