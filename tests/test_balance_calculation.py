import json
import pathlib
import unittest
from decimal import Decimal

ROOT = pathlib.Path(__file__).resolve().parents[1]

class BalanceCalculationTest(unittest.TestCase):
    def test_snapshot_exact_year_boundaries_and_precision(self):
        data = json.loads((ROOT / 'data/official-snapshot.json').read_text(), parse_float=Decimal)
        self.assertEqual(len(data['plans']), 4)
        expected_first = [Decimal('396635'), Decimal('454837.5'), Decimal('526435'), Decimal('556435')]
        for plan, expected in zip(data['plans'], expected_first):
            rows = dict(plan['balances'])
            self.assertEqual(Decimal('500000') * rows[5], expected)
            self.assertNotIn(4, rows)
            self.assertNotIn(61, rows)
            self.assertTrue(all(year > 0 and multiplier > 0 for year, multiplier in rows.items()))
        self.assertNotIn(6, dict(data['plans'][0]['balances']))
        self.assertEqual(Decimal('500000') * dict(data['plans'][3]['balances'])[6], Decimal('615000'))
